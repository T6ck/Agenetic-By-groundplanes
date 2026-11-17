-- Business data is separate from personal vaults and Groundplane MSP accounts.
create table public.agenetic_teams (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 owner_id uuid not null references auth.users(id), customer_id text unique, subscription_id text unique,
 status text not null default 'unpaid', seats integer not null default 0 check(seats between 0 and 500),
 period_end timestamptz, cancel_at_end boolean not null default false, billing_version bigint not null default 0,
 risk_hold boolean not null default false, created_at timestamptz not null default now()
);
create table public.agenetic_members (
 team_id uuid references public.agenetic_teams(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','member')), joined_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table public.agenetic_invites (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.agenetic_teams(id) on delete cascade,
 email text not null, token_hash text not null unique, role text not null check(role in ('admin','member')),
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.agenetic_projects (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.agenetic_teams(id) on delete cascade,
 name text not null, package jsonb not null check(octet_length(package::text)<=1100000), revision integer not null default 1,
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.agenetic_model_setups (
 team_id uuid primary key references public.agenetic_teams(id) on delete cascade, config jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.agenetic_keys (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.agenetic_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, name text not null, key_hash text unique not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '90 days', revoked_at timestamptz
);
create table public.agenetic_mail (
 id uuid primary key default gen_random_uuid(), team_id uuid references public.agenetic_teams(id), dedupe text unique not null,
 recipient text not null, subject text not null, body text not null, created_at timestamptz not null default now(),
 attempts integer not null default 0, next_attempt timestamptz not null default now(), leased_until timestamptz,
 sent_at timestamptz, provider_id text, failed boolean not null default false
);
create table public.agenetic_events (id text primary key, team_id uuid references public.agenetic_teams(id), event_type text not null, created_at timestamptz not null default now());
create table public.agenetic_requests (user_id uuid not null, request_id uuid not null, action text not null, result jsonb not null, created_at timestamptz not null default now(), primary key(user_id,request_id));
create table public.agenetic_support (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.agenetic_teams(id), user_id uuid not null references auth.users(id),
 subject text not null, body text not null, created_at timestamptz not null default now(), response_due_at timestamptz not null,
 first_reply_at timestamptz, status text not null default 'open'
);
create index agenetic_members_user on public.agenetic_members(user_id);
create index agenetic_invites_team on public.agenetic_invites(team_id);
create index agenetic_projects_team on public.agenetic_projects(team_id);
create index agenetic_mail_due on public.agenetic_mail(next_attempt) where sent_at is null and not failed;
-- No browser writes or broad policies. Edge handlers verify the user with Auth,
-- then call the service-only transactional API. Personal data is never ingested.
do $$ declare t text; begin
 foreach t in array array['agenetic_teams','agenetic_members','agenetic_invites','agenetic_projects','agenetic_model_setups','agenetic_keys','agenetic_mail','agenetic_events','agenetic_requests','agenetic_support'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.agenetic_command(p_user uuid,p_action text,p_body jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.agenetic_teams; m public.agenetic_members; inv public.agenetic_invites;
 tid uuid; rid uuid; email text; token text; result jsonb; previous jsonb; count_used integer; pid uuid; rev integer; sid uuid;
begin
 select lower(u.email) into email from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if email is null then raise exception 'Verify your business sign-in email first.' using errcode='42501'; end if;
 if p_action='teams' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'status',x.status,'seats',x.seats,'role',a.role,'risk_hold',x.risk_hold,'period_end',x.period_end)) from public.agenetic_teams x join public.agenetic_members a on a.team_id=x.id where a.user_id=p_user),'[]');
 end if;
 rid:=(p_body->>'request_id')::uuid;
 if p_action not in ('status','project_get','invoices_context','billing_context') then
 if rid is null then raise exception 'Request ID required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||rid::text,0));
 select r.result into previous from public.agenetic_requests r where r.user_id=p_user and r.request_id=rid and r.action=p_action;
 if previous is not null then return previous; end if;
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
 if inv.email<>email or inv.expires_at<=now() or inv.revoked_at is not null or inv.accepted_at is not null then raise exception 'Sign in with the invited email and use a current invitation.'; end if;
 if t.status not in ('active','trialing') or t.risk_hold or coalesce(t.period_end,now())<=now() then raise exception 'This team does not have an active subscription.'; end if;
 if (select count(*) from public.agenetic_members where team_id=t.id)>=t.seats then raise exception 'No seats available. Ask the owner to increase the seat count.'; end if;
 insert into public.agenetic_members values(t.id,p_user,inv.role,now());
 update public.agenetic_invites set accepted_at=now() where id=inv.id;
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(t.id,'joined:'||inv.id,email,'You have joined '||t.name,'Your team access is ready. Open https://groundplanes.com/team.html to view shared projects and model setups. Personal vaults stay on your device.');
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) select t.id,'joined-owner:'||inv.id,lower(u.email),'A member joined '||t.name,email||' accepted their invitation. Review members at https://groundplanes.com/team.html' from auth.users u where u.id=t.owner_id;
 result:=jsonb_build_object('id',t.id);
 else
 tid:=(p_body->>'team_id')::uuid;
 select * into t from public.agenetic_teams where id=tid for update;
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
 result:=to_jsonb(t)||jsonb_build_object('email',email,'used_seats',(select count(*) from public.agenetic_members where team_id=tid)+(select count(*) from public.agenetic_invites where team_id=tid and accepted_at is null and revoked_at is null and expires_at>now()));
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
 if exists(select 1 from public.agenetic_invites where team_id=tid and email=lower(p_body->>'email') and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'An invitation is already pending for this email.'; end if;
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
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(tid,'support:'||sid,'hello@groundplanes.com','Priority support: '||left(p_body->>'subject',160),'From: '||email||E'\nTeam: '||t.name||E'\nTicket: '||sid||E'\nSame-day first response (America/New_York).\n\n'||left(p_body->>'body',8000));
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) values(tid,'support-receipt:'||sid,email,'We received your support request','Ticket '||sid||'. We will reply today (America/New_York). This is a first-response commitment, not a guaranteed resolution time. Reply to hello@groundplanes.com if you need to add information.');
 result:=jsonb_build_object('id',sid);
 elsif p_action='entitlement' then result:=jsonb_build_object('team_id',tid,'features',jsonb_build_array('team','audit_export','license_admin','priority_support'));
 else raise exception 'Unknown action'; end if;
 end if;
 end if;
 if rid is not null and p_action not in ('status','project_get','invoices_context','billing_context') then insert into public.agenetic_requests(user_id,request_id,action,result) values(p_user,rid,p_action,result); end if;
 return result;
end $$;
revoke all on function public.agenetic_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.agenetic_command(uuid,text,jsonb) to service_role;

-- Every Stripe delivery is recorded atomically with entitlement changes.
create function public.agenetic_billing_apply(p_event text,p_type text,p_customer text,p_subscription text,p_status text,p_seats integer,p_end timestamptz,p_cancel boolean,p_version bigint,p_risk boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.agenetic_teams; old_status text;
begin
 select * into t from public.agenetic_teams where customer_id=p_customer for update;
 if t.id is null then return '{"ignored":true}'; end if;
 if exists(select 1 from public.agenetic_events where id=p_event) then return '{"duplicate":true}'; end if;
 if t.subscription_id is not null and t.subscription_id<>p_subscription then raise exception 'Subscription ownership conflict'; end if;
 insert into public.agenetic_events values(p_event,t.id,p_type,now()); old_status:=t.status;
 if p_version>=t.billing_version then
 update public.agenetic_teams set subscription_id=p_subscription,status=p_status,seats=greatest(0,least(p_seats,500)),period_end=p_end,cancel_at_end=p_cancel,billing_version=p_version,risk_hold=risk_hold or p_risk where id=t.id;
 if old_status<>p_status or p_cancel<>t.cancel_at_end or p_seats<>t.seats or p_risk then
 insert into public.agenetic_mail(team_id,dedupe,recipient,subject,body) select t.id,'billing:'||p_event,u.email,'Agenetic team billing updated',
 'Team: '||t.name||E'\nSubscription status: '||p_status||E'\nSeats: '||p_seats||E'\nCancel at period end: '||p_cancel||E'\nOpen https://groundplanes.com/team.html for invoices and membership. Your personal work stays free.' from auth.users u where u.id=t.owner_id;
 end if;
 end if;
 return '{"ok":true}';
end $$;
revoke all on function public.agenetic_billing_apply(text,text,text,text,text,integer,timestamptz,boolean,bigint,boolean) from public,anon,authenticated;
grant execute on function public.agenetic_billing_apply(text,text,text,text,text,integer,timestamptz,boolean,bigint,boolean) to service_role;

create function public.agenetic_mail_claim() returns setof public.agenetic_mail language sql security invoker set search_path='' as $$
 update public.agenetic_mail set leased_until=now()+interval '2 minutes',attempts=attempts+1
 where id in(select id from public.agenetic_mail where sent_at is null and not failed and next_attempt<=now() and (leased_until is null or leased_until<now()) and created_at>now()-interval '23 hours' order by created_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.agenetic_mail_claim() from public,anon,authenticated;
grant execute on function public.agenetic_mail_claim() to service_role;
