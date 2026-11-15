CREATE TABLE IF NOT EXISTS community_reports (
 id TEXT PRIMARY KEY,
 post_id TEXT NOT NULL,
 reporter TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 resolved INTEGER NOT NULL DEFAULT 0,
 UNIQUE(post_id,reporter)
);
CREATE INDEX IF NOT EXISTS community_reports_queue ON community_reports(resolved,created_at);
CREATE INDEX IF NOT EXISTS community_posts_page ON community_posts(channel,deleted,created_at,id);
