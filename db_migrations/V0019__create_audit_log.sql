CREATE TABLE IF NOT EXISTS t_p39946729_azs_lg_project.audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_name VARCHAR(255) NOT NULL DEFAULT '',
  user_login VARCHAR(255) NOT NULL DEFAULT '',
  user_role VARCHAR(20) NOT NULL DEFAULT '',
  ip VARCHAR(64) NOT NULL DEFAULT '',
  device VARCHAR(255) NOT NULL DEFAULT '',
  action VARCHAR(30) NOT NULL,
  section VARCHAR(60) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON t_p39946729_azs_lg_project.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON t_p39946729_azs_lg_project.audit_log(action, created_at);