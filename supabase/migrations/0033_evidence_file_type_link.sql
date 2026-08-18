-- Tambah nilai 'link' ke enum vmt.file_type supaya peserta bisa mengirim
-- bukti penugasan berupa tautan (URL), bukan hanya file yang diupload.
alter type vmt.file_type add value if not exists 'link';
