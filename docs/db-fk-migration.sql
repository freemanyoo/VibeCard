-- PostgreSQL foreign key migration
-- Run db-orphan-check.sql first and clean invalid rows before this migration.

alter table invitation
    add constraint fk_invitation_user
    foreign key (user_id) references users(id)
    on delete cascade;

alter table invitation
    add constraint fk_invitation_skin
    foreign key (skin_id) references skin(id)
    on delete set null;

alter table bank_account
    add constraint fk_bank_account_invitation
    foreign key (invitation_id) references invitation(id)
    on delete cascade;

alter table attendance
    add constraint fk_attendance_invitation
    foreign key (invitation_id) references invitation(id)
    on delete cascade;

alter table guestbook
    add constraint fk_guestbook_invitation
    foreign key (invitation_id) references invitation(id)
    on delete cascade;

alter table refresh_tokens
    add constraint fk_refresh_tokens_user
    foreign key (user_id) references users(id)
    on delete cascade;

alter table media_files
    add constraint fk_media_files_user
    foreign key (user_id) references users(id)
    on delete cascade;

alter table ai_generation_history
    add constraint fk_ai_generation_history_user
    foreign key (user_id) references users(id)
    on delete cascade;

alter table ai_generation_history
    add constraint fk_ai_generation_history_source_image
    foreign key (source_image_id) references media_files(id)
    on delete set null;

alter table ai_prompt_block_logs
    add constraint fk_ai_prompt_block_logs_user
    foreign key (user_id) references users(id)
    on delete set null;
