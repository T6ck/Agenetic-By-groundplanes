-- Leave room for PostgreSQL's JSONB text formatting around the 16 MB transport limit.
alter table public.agenetic_projects drop constraint agenetic_projects_package_check,
 add constraint agenetic_projects_package_check check(octet_length(package::text)<=20000000);

create or replace function public.agenetic_command(p_user uuid,p_action text,p_body jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.agenetic_teams; m public.agenetic_members; inv public.agenetic_invites;
 tid uuid; rid uuid; user_email text; token text; result jsonb; previous jsonb; count_used integer; pid uuid; rev integer; sid uuid;
begin
 select lower(u.email) into user_email from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if user_email is null then raise exception 'Verify your business sign-in email first.' using errcode='42501'; end if;
 if p_action='teams' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'status',x.status,'seats',x.seats,'role',a.role,'risk_hold',x.risk_hold,'period_end',x.period_end)) from public.agenetic_teams x join public.agenetic_members a on a.team_id=x.id where a.user_id=p_user),'[]');
 end if;
 rid:=(p_body->>'request_id')::uuid;
 if p_action not in ('status','project_get','invoices_context','billing_context','entitlement') then
 if rid is null then raise exception 'Request ID required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||rid::text,0));
 select r.result into previous from public.agenetic_requests r where r.user_id=p_user and r.request_id=rid and r.action=p_action;
 if previous is not null then
 if p_action='key_create' then raise exception 'This key was already created. Revoke the previous key if it was not saved, then create a new one.'; end if;
 return previous; end if;
 end if;
 if p_action='create_team' then
 if (select count(*) from public.agenetic_teams where owner_id=p_user)>=5 then raise exception 'Contact support to create more teams.'; end if;
 insert into public.agenetic_teams(name,owner_id) values(trim(p_body->>'name'),p_user) returning id into tid;
 insert into public.agenetic_members values(tid,p_user,'owner',now()); result:=jsonb_build_object('id',tid);
 elsif p_action='accept' then
 select * into inv from public.agenetic_invites where token_hash=p_body->>'token_hash';
 if inv.id is null then raise exception 'Invitation is invalid or expired.'; end if;
 select * into t from public.agenetic_teams where id=inv.team_id for update;
 select * into inv from public.agenetic_invites where id=inv.id for update;
 if inv.email<>user_email or inv.expires_at<=now() or inv.revoked_at is not null or inv.accepted_at is not null then raise exception 'Sign in with the invited email and use a current invitation.'; end if;
 if t.status not in ('active','trialing') or t.risk_hold or coalesce(t.period_end,now())<=now() then raise exception 'This team does not have an active subscription.'; end if;
 if (select count(*) from public.agenetic_members where team_id=t.id)>=t.seats then raise exception 'No seats available. Ask the owner to increase the seat count.'; end if;
 insert into public.agenetic_members values(t.id,p_user,inv.role,now());
 update public.agenetic_invites set accepted_at=now() where id=inv.id;
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(t.id,'joined:'||inv.id,user_email,'You have joined '||t.name,'Your team access is ready. Open https://groundplanes.com/team.html to view shared projects and model setups. Personal vaults stay on your device.');
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) select t.id,'joined-owner:'||inv.id,lower(u.email),'A member joined '||t.name,user_email||' accepted their invitation. Review members at https://groundplanes.com/team.html' from auth.users u where u.id=t.owner_id;
 result:=jsonb_build_object('id',t.id);
 else
 tid:=(p_body->>'team_id')::uuid;
 if p_action in ('status','project_get') then
  select * into t from public.agenetic_teams where id=tid for share;
 else
  select * into t from public.agenetic_teams where id=tid for update;
 end if;
 select * into m from public.agenetic_members where team_id=tid and user_id=p_user;
 if m.user_id is null then raise exception 'This team is not available to your account.' using errcode='42501'; end if;
 if p_action='status' then
 result:=jsonb_build_object('team',to_jsonb(t)-'customer_id'-'subscription_id','role',m.role,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',a.user_id,'role',a.role,'email',case when m.role in ('owner','admin') then u.email else null end)),'[]') from public.agenetic_members a join auth.users u on u.id=a.user_id where team_id=tid),
 'invites',case when m.role in ('owner','admin') then (select coalesce(jsonb_agg(to_jsonb(i)-'token_hash'),'[]') from public.agenetic_invites i where team_id=tid and accepted_at is null and revoked_at is null and expires_at>now()) else '[]'::jsonb end,
 'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'revision',revision,'updated_at',updated_at)),'[]') from public.agenetic_projects where team_id=tid),
 'model_setup',(select jsonb_build_object('config',config,'revision',revision) from public.agenetic_model_setups where team_id=tid),
 'keys',(select coalesce(jsonb_agg(to_jsonb(k)-'key_hash'),'[]') from public.agenetic_keys k where team_id=tid and (k.user_id=p_user or m.role='owner') and revoked_at is null),
 'mail_pending',case when m.role='owner' then (select count(*) from public.agenetic_mail where team_id=tid and sent_at is null) else 0 end);
 return result;
 end if;
 if p_action in ('billing_context','invoices_context','remove','invite','revoke_invite','model_put','key_revoke') and m.role not in ('owner','admin') then raise exception 'Team administrator access required.' using errcode='42501'; end if;
 if p_action in ('billing_context','invoices_context') then
 if m.role<>'owner' then raise exception 'Only the owner can manage billing.' using errcode='42501'; end if;
 result:=to_jsonb(t)||jsonb_build_object('email',user_email,'used_seats',(select count(*) from public.agenetic_members where team_id=tid)+(select count(*) from public.agenetic_invites where team_id=tid and accepted_at is null and revoked_at is null and expires_at>now()));
 elsif p_action='remove' then
 if (select role from public.agenetic_members where team_id=tid and user_id=(p_body->>'user_id')::uuid)='owner' then raise exception 'The owner cannot be removed.'; end if;
 delete from public.agenetic_members where team_id=tid and user_id=(p_body->>'user_id')::uuid;
 update public.agenetic_keys set revoked_at=now() where team_id=tid and user_id=(p_body->>'user_id')::uuid;
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) select tid,'removed:'||rid,u.email,'Team access removed','Your access to '||t.name||' was removed. Your personal work remains yours and stays free.' from auth.users u where u.id=(p_body->>'user_id')::uuid;
 result:='{"ok":true}';
 elsif p_action='revoke_invite' then
 update public.agenetic_invites set revoked_at=now() where team_id=tid and id=(p_body->>'id')::uuid and accepted_at is null; result:='{"ok":true}';
 elsif p_action='key_revoke' then
 update public.agenetic_keys set revoked_at=now() where team_id=tid and id=(p_body->>'id')::uuid; result:='{"ok":true}';
 else
 if t.status not in ('active','trialing') or t.risk_hold or coalesce(t.period_end,now())<=now() then raise exception 'An active team subscription is required. Personal features remain free.' using errcode='42501'; end if;
 if (select count(*) from public.agenetic_members where team_id=tid)>t.seats then raise exception 'Seat count is below active membership. The owner must reconcile seats.'; end if;
 if p_action='invite' then
 select count(*) into count_used from public.agenetic_members where team_id=tid;
 count_used:=count_used+(select count(*) from public.agenetic_invites where team_id=tid and accepted_at is null and revoked_at is null and expires_at>now());
 if count_used>=t.seats then raise exception 'All seats are allocated. Increase seats or revoke an unused invitation.'; end if;
 if exists(select 1 from public.agenetic_invites i where team_id=tid and i.email=lower(p_body->>'email') and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'An invitation is already pending for this email.'; end if;
 if exists(select 1 from public.agenetic_members a join auth.users u on u.id=a.user_id where team_id=tid and lower(u.email)=lower(p_body->>'email')) then raise exception 'This person is already a member.'; end if;
 insert into public.agenetic_invites(team_id,email,role,token_hash) values(tid,lower(p_body->>'email'),p_body->>'role',p_body->>'token_hash') returning id into sid;
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(tid,'invite:'||sid,lower(p_body->>'email'),'Join '||t.name||' on Agenetic',
 'You have been invited to '||t.name||'. Sign in with this email and open: https://groundplanes.com/team.html#invite='||(p_body->>'token')||E'\n\nThis invitation expires in seven days. Joining does not upload your personal files. If you did not expect this invitation, ignore it.');
 result:=jsonb_build_object('id',sid,'email_queued',true);
 elsif p_action='project_get' then
 select jsonb_build_object('package',package,'revision',revision,'name',name) into result from public.agenetic_projects where id=(p_body->>'id')::uuid and team_id=tid;
 if result is null then raise exception 'Project not found'; end if;
 elsif p_action='project_put' then
 pid:=coalesce((p_body->>'id')::uuid,gen_random_uuid());
 if exists(select 1 from public.agenetic_projects where id=pid) then
 update public.agenetic_projects set package=p_body->'package',name=p_body->>'name',revision=revision+1,updated_by=p_user,updated_at=now() where id=pid and team_id=tid and revision=(p_body->>'revision')::integer returning revision into rev;
 if rev is null then raise exception 'Project changed. Download the latest revision before replacing it.' using errcode='40001'; end if;
 else
 if (select count(*) from public.agenetic_projects where team_id=tid)>=100 then raise exception 'Team project capacity reached. Contact support.'; end if;
 insert into public.agenetic_projects(id,team_id,name,package,updated_by) values(pid,tid,p_body->>'name',p_body->'package',p_user); rev:=1;
 end if;
 result:=jsonb_build_object('id',pid,'revision',rev);
 elsif p_action='model_put' then
 if m.role not in ('owner','admin') then raise exception 'Administrator access required'; end if;
 if exists(select 1 from public.agenetic_model_setups where team_id=tid) then
 update public.agenetic_model_setups set config=p_body->'config',revision=revision+1,updated_at=now() where team_id=tid and revision=(p_body->>'revision')::integer returning revision into rev;
 if rev is null then raise exception 'Model setup changed. Refresh before saving.' using errcode='40001'; end if;
 else insert into public.agenetic_model_setups(team_id,config) values(tid,p_body->'config'); rev:=1; end if;
 result:=jsonb_build_object('revision',rev);
 elsif p_action='key_create' then
 if (select count(*) from public.agenetic_keys where team_id=tid and user_id=p_user and revoked_at is null and expires_at>now())>=5 then raise exception 'Revoke an old device key first.'; end if;
 insert into public.agenetic_keys(team_id,user_id,name,key_hash) values(tid,p_user,left(p_body->>'name',80),p_body->>'key_hash') returning id into sid;
 result:=jsonb_build_object('id',sid);
 elsif p_action='support' then
 if (select count(*) from public.agenetic_support where user_id=p_user and created_at>now()-interval '1 day')>=5 then raise exception 'Five support requests are already open from today.'; end if;
 insert into public.agenetic_support(team_id,user_id,subject,body,response_due_at) values(tid,p_user,left(p_body->>'subject',160),left(p_body->>'body',8000),((date_trunc('day',now() at time zone 'America/New_York')+interval '1 day') at time zone 'America/New_York')) returning id into sid;
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(tid,'support:'||sid,'hello@groundplanes.com','Priority support: '||left(p_body->>'subject',160),'From: '||user_email||E'\nTeam: '||t.name||E'\nTicket: '||sid||E'\nSame-day first response (America/New_York).\n\n'||left(p_body->>'body',8000));
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(tid,'support-receipt:'||sid,user_email,'We received your support request','Ticket '||sid||'. We will reply today (America/New_York). This is a first-response commitment, not a guaranteed resolution time. Reply to hello@groundplanes.com if you need to add information.');
 result:=jsonb_build_object('id',sid);
 elsif p_action='entitlement' then result:=jsonb_build_object('team_id',tid,'features',jsonb_build_array('team','audit_export','license_admin','priority_support'));
 else raise exception 'Unknown action'; end if;
 end if;
 end if;
 if rid is not null and p_action not in ('status','project_get','invoices_context','billing_context','entitlement') then insert into public.agenetic_requests(user_id,request_id,action,result) values(p_user,rid,p_action,result); end if;
 return result;
end $$;
