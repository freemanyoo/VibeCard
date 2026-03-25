-- PostgreSQL orphan data checks
-- Run these first. If any row is returned, clean the data before adding FK constraints.

-- invitation.user_id -> users.id
select i.id, i.user_id
from invitation i
left join users u on u.id = i.user_id
where i.user_id is not null
  and u.id is null;

-- invitation.skin_id -> skin.id
select i.id, i.skin_id
from invitation i
left join skin s on s.id = i.skin_id
where i.skin_id is not null
  and s.id is null;

-- bank_account.invitation_id -> invitation.id
select b.id, b.invitation_id
from bank_account b
left join invitation i on i.id = b.invitation_id
where b.invitation_id is not null
  and i.id is null;

-- attendance.invitation_id -> invitation.id
select a.id, a.invitation_id
from attendance a
left join invitation i on i.id = a.invitation_id
where a.invitation_id is not null
  and i.id is null;

-- guestbook.invitation_id -> invitation.id
select g.id, g.invitation_id
from guestbook g
left join invitation i on i.id = g.invitation_id
where g.invitation_id is not null
  and i.id is null;

-- refresh_tokens.user_id -> users.id
select r.id, r.user_id
from refresh_tokens r
left join users u on u.id = r.user_id
where r.user_id is not null
  and u.id is null;

-- media_files.user_id -> users.id
select m.id, m.user_id
from media_files m
left join users u on u.id = m.user_id
where m.user_id is not null
  and u.id is null;

-- ai_generation_history.user_id -> users.id
select a.id, a.user_id
from ai_generation_history a
left join users u on u.id = a.user_id
where a.user_id is not null
  and u.id is null;

-- ai_generation_history.source_image_id -> media_files.id
select a.id, a.source_image_id
from ai_generation_history a
left join media_files m on m.id = a.source_image_id
where a.source_image_id is not null
  and m.id is null;

-- ai_prompt_block_logs.user_id -> users.id
select l.id, l.user_id
from ai_prompt_block_logs l
left join users u on u.id = l.user_id
where l.user_id is not null
  and u.id is null;
