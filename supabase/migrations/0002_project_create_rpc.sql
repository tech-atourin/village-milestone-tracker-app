-- =====================================================
-- 0002_project_create_rpc.sql
-- =====================================================
-- RPC to create a project from a template in one transaction:
--   1. insert into vmt.projects
--   2. copy template_topik → project_topik
--   3. copy template_checklist_item → project_checklist_item
-- Returns the new project's id.
--
-- Callable from any authenticated session; RLS on
-- vmt.projects (superadmin_all_projects) already gates
-- who can invoke it.
-- =====================================================

create or replace function vmt.create_project_from_template(
  p_organization_id uuid,
  p_template_id uuid,
  p_name text,
  p_description text,
  p_period_start date,
  p_period_end date,
  p_enabled_modules jsonb,
  p_status vmt.project_status default 'draft'
)
returns uuid
language plpgsql
security invoker
set search_path = vmt, public, pg_temp
as $$
declare
  v_project_id uuid;
  v_topik record;
  v_new_topik_id uuid;
begin
  -- Authorise
  if not vmt.is_superadmin() then
    raise exception 'forbidden: only superadmin can create projects';
  end if;

  insert into vmt.projects (
    organization_id, template_id, name, description,
    period_start, period_end, status, enabled_modules, created_by
  ) values (
    p_organization_id, p_template_id, p_name, p_description,
    p_period_start, p_period_end, p_status, p_enabled_modules, auth.uid()
  )
  returning id into v_project_id;

  -- Copy topik + checklist if a template was used
  if p_template_id is not null then
    for v_topik in
      select * from vmt.template_topik
      where template_id = p_template_id
      order by sort_order
    loop
      insert into vmt.project_topik (
        project_id, name, description, source_template_topik_id, sort_order
      ) values (
        v_project_id, v_topik.name, v_topik.description, v_topik.id, v_topik.sort_order
      )
      returning id into v_new_topik_id;

      insert into vmt.project_checklist_item (
        project_topik_id, title, description, reference_url, required, sort_order
      )
      select v_new_topik_id, title, description, reference_url, required, sort_order
      from vmt.template_checklist_item
      where template_topik_id = v_topik.id
      order by sort_order;
    end loop;
  end if;

  return v_project_id;
end;
$$;

grant execute on function vmt.create_project_from_template(uuid, uuid, text, text, date, date, jsonb, vmt.project_status) to authenticated;
