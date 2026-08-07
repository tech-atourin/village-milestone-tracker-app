-- Kuis multi-modul: tiap soal bisa ditandai ke materi (topik) tertentu, sehingga
-- satu kuis (mis. pre-test 25 soal) otomatis terpecah nilainya per modul saat
-- masuk rapor peserta. Nullable: kalau kosong, ikut topik kuis (quizzes.topik_id)
-- seperti perilaku lama.

alter table vmt.quiz_questions
  add column if not exists topik_id uuid
  references vmt.project_topik(id) on delete set null;

create index if not exists quiz_questions_topik_id_idx
  on vmt.quiz_questions(topik_id);
