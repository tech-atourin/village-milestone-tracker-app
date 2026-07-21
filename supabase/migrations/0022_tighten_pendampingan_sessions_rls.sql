-- 0022_tighten_pendampingan_sessions_rls.sql
-- Sebelumnya policy membuka SELURUH sesi project ke setiap anggota project
-- (klausa "project_id IN auth_user_projects()"), sehingga peserta Desa A bisa
-- membaca jadwal pendampingan Desa B lewat API meski UI sudah menyaringnya.
-- Kini akses dibatasi ke desa masing-masing, tanpa mengubah akses peran lain.
drop policy if exists scope_pendampingan_sessions_read on vmt.pendampingan_sessions;

create policy scope_pendampingan_sessions_read on vmt.pendampingan_sessions
  for select to authenticated
  using (
    vmt.is_superadmin()
    -- narasumber pembawa sesi
    or narasumber_id = auth.uid()
    -- anggota project yang terikat ke sebuah desa: hanya sesi desanya sendiri
    or project_desa_id in (
      select pd.id
      from vmt.project_desa pd
      join vmt.project_memberships m
        on m.project_id = pd.project_id and m.desa_id = pd.desa_id
      where m.user_id = auth.uid() and m.status = 'active'
    )
    -- anggota project tanpa ikatan desa (mis. narasumber lintas desa):
    -- tetap boleh melihat seluruh sesi project tersebut
    or exists (
      select 1 from vmt.project_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.project_id = pendampingan_sessions.project_id
        and m.desa_id is null
    )
    -- akun desa_wisata: sesi desa yang diwakilinya
    or project_desa_id in (
      select pd.id from vmt.project_desa pd
      where pd.desa_id in (
        select u.representing_desa_id from vmt.users u where u.id = auth.uid()
      )
    )
  );
