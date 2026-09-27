insert into private.snar_legal_versions(version,terms_sha256,privacy_sha256,effective_at,archive_path)
values(
  '2026-09-27-v4',
  '758e771cdefff1e75868a15da1023d6ee2b63d76b691a4c3fda3b3d48191b0de',
  'f588cfcc3208886f6c6641837e3109addb37448441709e6553984f4c7a67cd5a',
  '2026-09-27T00:00:00Z',
  'legal/versions/2026-09-27-v4/'
)
on conflict (version) do update set
  terms_sha256=excluded.terms_sha256,
  privacy_sha256=excluded.privacy_sha256,
  effective_at=excluded.effective_at,
  archive_path=excluded.archive_path;
