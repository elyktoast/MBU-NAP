insert into private.snar_legal_versions(version,terms_sha256,privacy_sha256,effective_at,archive_path)
values(
  '2026-09-27-v4',
  '200038ba8b9938d792b867f0d7931075955f78c23aaa6cc7a324611c2779236e',
  'c3381791ece8d47dc4e74af9519ba74fd0f3930abdf9f36cd1f871660fd3d52f',
  '2026-09-27T00:00:00Z',
  'legal/versions/2026-09-27-v4/'
)
on conflict (version) do update set
  terms_sha256=excluded.terms_sha256,
  privacy_sha256=excluded.privacy_sha256,
  effective_at=excluded.effective_at,
  archive_path=excluded.archive_path;
