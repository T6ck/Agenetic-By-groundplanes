-- Public wake-up route has no arguments; only service-owned outbox rows are sent.
select cron.schedule('agenetic-mail-delivery', '* * * * *', $$
 select net.http_post(url:='https://tejsbytmtcdzvgzlpkgp.supabase.co/functions/v1/agenetic-mail', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);
$$);
