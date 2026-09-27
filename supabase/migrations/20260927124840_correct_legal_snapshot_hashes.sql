
update private.snar_legal_versions
set terms_sha256=case version
      when '2026-09-27-v2' then 'ac9a7aa0f106c3f107a0586e910c2655ba44b6ed51a5a9671c660f8210cd4af0'
      when '2026-09-27-v3' then '2d37d30d640141a8d12c818cbfe1591d70013110bdfcca72ffb915ceb99422cf'
      when '2026-09-27-v4' then '758e771cdefff1e75868a15da1023d6ee2b63d76b691a4c3fda3b3d48191b0de'
      else terms_sha256 end,
    privacy_sha256=case version
      when '2026-09-27-v2' then '056ebca0f516e7bff38eaf81f89b065ac7b0cc9731a1d305fb38e12054679f67'
      when '2026-09-27-v3' then 'e2221b02cc9911c06f8efd7e8c4c7916b77863516da766dbdd60445597cedffa'
      when '2026-09-27-v4' then 'f588cfcc3208886f6c6641837e3109addb37448441709e6553984f4c7a67cd5a'
      else privacy_sha256 end
where version in ('2026-09-27-v2','2026-09-27-v3','2026-09-27-v4');

update private.snar_legal_acceptances a
set terms_sha256=v.terms_sha256,
    privacy_sha256=v.privacy_sha256
from private.snar_legal_versions v
where a.terms_version=v.version
  and a.privacy_version=v.version;
