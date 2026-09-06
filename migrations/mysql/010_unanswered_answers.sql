ALTER TABLE chat_unanswered_queries
  ADD COLUMN answer TEXT NULL AFTER query_text,
  ADD COLUMN answered_at DATETIME NULL AFTER answer;