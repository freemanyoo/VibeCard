# ERD

현재 문서는 `자바 엔티티 + 실제 DB 컬럼`이 함께 존재하는 과도기 구조 기준입니다.

- 관계선: 현재 JPA 관계 기준
- 속성명: 실제 DB 컬럼명 기준으로 읽기 쉽게 표기
- 타입: 자바 엔티티 필드 타입 기준

```mermaid
erDiagram
    USERS ||--o{ INVITATION : owns
    USERS ||--o{ MEDIA_FILES : uploads
    USERS ||--o{ AI_GENERATION_HISTORY : creates
    USERS ||--o{ AI_PROMPT_BLOCK_LOGS : triggers
    USERS ||--|| REFRESH_TOKENS : has

    SKIN ||--o{ INVITATION : applies_to
    MEDIA_FILES ||--o{ AI_GENERATION_HISTORY : source_of

    INVITATION ||--o{ BANK_ACCOUNT : has
    INVITATION ||--o{ ATTENDANCE : has
    INVITATION ||--o{ GUESTBOOK : has

    USERS {
        string id PK
        string email UK
        string password
        string provider
        string provider_id
        string role
        datetime created_at
    }

    SKIN {
        string id PK
        string name
        string slug UK
        string description
        string config
        string thumbnail
        boolean is_active
        datetime created_at
    }

    INVITATION {
        string id PK
        string slug UK
        string user_id FK
        string skin_id FK
        string groom_name
        string bride_name
        datetime wedding_date
        string venue_name
        string venue_address
        string main_photo_url
        string main_photo_fit
        string main_photo_position
        string template
        string invitation_title
        string invitation_message
        string groom_father
        string groom_mother
        string groom_relation
        string groom_phone
        string groom_father_phone
        string groom_mother_phone
        string bride_father
        string bride_mother
        string bride_relation
        string bride_phone
        string bride_father_phone
        string bride_mother_phone
        string album_photos
        string config
        boolean is_published
        string youtube_url
        string bgm_url
        string notice_title
        string notice_content
        boolean d_day_enabled
        boolean navigation_enabled
        datetime created_at
    }

    BANK_ACCOUNT {
        bigint id PK
        string invitation_id FK
        string owner_type
        string bank_name
        string account_number
        string owner_name
    }

    ATTENDANCE {
        bigint id PK
        string invitation_id FK
        string name
        string side
        boolean attending
        int count
        boolean meal
        int meal_count
        string message
        datetime created_at
    }

    GUESTBOOK {
        bigint id PK
        string invitation_id FK
        string writer_name
        string content
        datetime created_at
    }

    MEDIA_FILES {
        string id PK
        string user_id FK
        string storage_mode
        string original_bucket
        string original_object_key
        string original_url
        string thumb_bucket
        string thumb_object_key
        string thumb_url
        string analysis_bucket
        string analysis_object_key
        string analysis_url
        string mime_type
        int width
        int height
        bigint file_size
        datetime created_at
    }

    AI_GENERATION_HISTORY {
        string id PK
        string user_id FK
        string source_image_id FK
        string source_image_url
        string type
        string provider
        string result_summary
        string config_patch_json
        datetime created_at
    }

    AI_PROMPT_BLOCK_LOGS {
        string id PK
        string user_id FK
        string user_email
        string prompt
        string reason
        datetime created_at
    }

    REFRESH_TOKENS {
        bigint id PK
        string token UK
        uuid user_id FK
        datetime expiry_date
    }
```

## 핵심 관계

- `invitation.user_id -> users.id`
- `invitation.skin_id -> skin.id`
- `bank_account.invitation_id -> invitation.id`
- `attendance.invitation_id -> invitation.id`
- `guestbook.invitation_id -> invitation.id`
- `refresh_tokens.user_id -> users.id`
- `media_files.user_id -> users.id`
- `ai_generation_history.user_id -> users.id`
- `ai_generation_history.source_image_id -> media_files.id`
- `ai_prompt_block_logs.user_id -> users.id`

## 메모

- 현재 코드는 `관계 객체`와 `문자열 id 컬럼`을 함께 유지하는 과도기 구조입니다.
- 예: `Invitation.skinId` 와 `Invitation.skin`, `MediaFile.userId` 와 `MediaFile.user`
- 즉 이 문서는 "순수 엔티티 필드만" 정리한 문서가 아니라, 현재 운영 구조 설명용 ERD입니다.
- `refresh_tokens`는 현재 코드 기준 `User 1 : 1 RefreshToken` 입니다.
- 운영 DB에 FK 제약을 추가하기 전 orphan 데이터 점검이 필요합니다.
- 관련 SQL:
- [db-orphan-check.sql](/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/docs/db-orphan-check.sql)
- [db-fk-migration.sql](/Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding Invitation/WEDDING_WEB/docs/db-fk-migration.sql)
