# DB 무결성 점검과 FK 마이그레이션

이 작업은 보통 아래처럼 부릅니다.

- 데이터 무결성 점검
- 외래 키(FK) 마이그레이션

쉽게 말하면:

- `db-orphan-check.sql` 은 검사기입니다.
- `db-fk-migration.sql` 은 자물쇠를 거는 작업입니다.

## 1. db-orphan-check.sql 이란?

이 파일은 현재 DB 안에 **깨진 연결**이 있는지 확인합니다.

예시:

- 청첩장은 있는데 그 청첩장을 만든 유저가 없음
- AI 생성 기록은 있는데 원본 이미지 파일이 없음
- 방명록은 있는데 연결된 청첩장이 없음

이런 데이터를 보통 `orphan data` 라고 부릅니다.

즉:

- 부모 데이터는 없는데
- 자식 데이터만 남아있는 상태

이 파일은 그런 문제를 먼저 찾는 용도입니다.

## 2. db-fk-migration.sql 이란?

이 파일은 DB에 **규칙**을 추가하는 작업입니다.

이 규칙을 보통 `외래 키(Foreign Key, FK)` 라고 부릅니다.

예시:

- `invitation.user_id` 는 반드시 `users.id` 에 있어야 한다
- `ai_generation_history.source_image_id` 는 반드시 `media_files.id` 에 있어야 한다

이걸 적용하면 앞으로는 잘못된 연결이 저장되지 않습니다.

즉 DB가 직접 막아줍니다.

## 3. 왜 두 단계로 나누나?

바로 FK를 걸면 안 될 수 있기 때문입니다.

만약 이미 DB 안에 깨진 데이터가 들어있으면:

- FK 추가가 실패할 수 있습니다.

그래서 순서가 중요합니다.

## 4. 실행 순서

1. `db-orphan-check.sql` 실행
2. 결과가 비어 있는지 확인
3. 문제가 없으면 `db-fk-migration.sql` 실행

## 4-1. 실제 실행 방법

현재 프로젝트는 PostgreSQL Docker 컨테이너를 사용합니다.

컨테이너 이름:

- `vibecard-postgres`

DB 접속 기본 예시는 아래처럼 하면 됩니다.

```bash
ssh -p 2222 freemanyoo@192.168.50.94
cd /volume1/VibeCard
/usr/local/bin/docker exec -it vibecard-postgres psql -U vibecard -d vibecard
```

위 명령 뜻:

- `docker exec -it vibecard-postgres` : 실행 중인 PostgreSQL 컨테이너 안으로 들어감
- `psql` : PostgreSQL 명령창 실행
- `-U vibecard` : DB 사용자
- `-d vibecard` : DB 이름

## 4-2. SQL 파일 실행 방법

### 방법 1. psql 안에서 실행

`psql`에 들어간 뒤:

```sql
\i /volume1/VibeCard/docs/db-orphan-check.sql
```

또는:

```sql
\i /volume1/VibeCard/docs/db-fk-migration.sql
```

### 방법 2. 한 줄 명령으로 바로 실행

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker exec -i vibecard-postgres psql -U vibecard -d vibecard" < /Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding\ Invitation/WEDDING_WEB/docs/db-orphan-check.sql
```

FK 적용도 같은 방식입니다.

```bash
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker exec -i vibecard-postgres psql -U vibecard -d vibecard" < /Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding\ Invitation/WEDDING_WEB/docs/db-fk-migration.sql
```

## 4-3. 실행 후 어떻게 판단하나

`db-orphan-check.sql`

- 아무 행도 안 나오면 정상
- 뭔가 나오면 깨진 연결이 있다는 뜻

`db-fk-migration.sql`

- `ALTER TABLE` 성공 메시지가 나오면 적용됨
- 이미 같은 제약이 있으면 중복 에러가 날 수 있음

## 4-4. 자주 쓰는 psql 기본 문법

```sql
select * from users;
```

뜻:

- `users` 테이블의 모든 데이터를 조회

```sql
select id, email from users;
```

뜻:

- `users` 테이블에서 `id`, `email` 컬럼만 조회

```sql
select * from invitation where user_id is null;
```

뜻:

- `invitation` 테이블에서 `user_id`가 비어 있는 데이터 조회

```sql
alter table invitation
add constraint fk_invitation_user
foreign key (user_id) references users(id)
on delete cascade;
```

뜻:

- `invitation` 테이블 구조를 바꿈
- `fk_invitation_user` 라는 이름의 규칙을 추가
- `user_id` 는 반드시 `users.id` 를 참조해야 함
- 유저가 삭제되면 그 유저의 청첩장도 같이 삭제

## 4-5. 세미콜론 `;` 은 왜 붙이나

SQL 한 문장이 끝났다는 뜻입니다.

예:

```sql
select * from users;
```

여기서 `;` 가 있어야 PostgreSQL이

"이 문장은 여기서 끝났다"

라고 이해합니다.

## 4-6. 추천 실행 순서

```bash
# 1. orphan 검사
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker exec -i vibecard-postgres psql -U vibecard -d vibecard" < /Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding\ Invitation/WEDDING_WEB/docs/db-orphan-check.sql

# 2. 결과가 비어 있으면 FK 적용
ssh -p 2222 freemanyoo@192.168.50.94 "/usr/local/bin/docker exec -i vibecard-postgres psql -U vibecard -d vibecard" < /Users/freemanyoo/Library/CloudStorage/SynologyDrive-develop/Wedding\ Invitation/WEDDING_WEB/docs/db-fk-migration.sql
```

## 5. 한 줄로 정리

- `db-orphan-check.sql` = 지금 데이터가 깨졌는지 검사
- `db-fk-migration.sql` = 앞으로 안 깨지게 DB에 규칙 추가

## 6. 비유

- `orphan-check` = 건강검진
- `fk-migration` = 안전장치 설치

즉, 지금 만든 건

“현재 데이터 상태를 먼저 확인하고,
이후에는 DB가 잘못된 연결을 직접 막도록 만드는 작업”

입니다.
