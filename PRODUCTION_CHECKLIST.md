# 실사용 전환 체크

이 문서는 현재 `dev` 기반 프로젝트를 시놀로지 실서비스 환경(`prod`)으로 전환할 때 확인해야 할 작업 목록입니다.

## 용어 정리

### 콘솔/디버그 기능 비활성화

개발 중에는 편의를 위해 켜두는 기능이 있습니다. 실서비스에서는 이런 기능을 꺼야 합니다.

- H2 콘솔: 브라우저에서 DB를 직접 보는 개발용 화면
- 상세 에러 노출: 내부 오류 정보가 외부에 그대로 보이는 설정
- 과도한 개발 로그: 요청/토큰/민감정보가 로그에 남을 수 있는 디버그 로그

현재 프로젝트 기준으로는 `prod`에서 H2 콘솔을 끄는 것이 대표적인 예입니다.

### 시크릿 분리

시크릿은 외부에 노출되면 안 되는 민감한 값입니다.

- DB 비밀번호
- OAuth Client Secret
- 메일 비밀번호
- JWT 비밀키
- OpenAI/OpenClaw 토큰
- MinIO Access Key / Secret Key

이 값들은 Git에 올리면 안 되고, 실서비스에서는 아래 위치 중 하나에서만 관리해야 합니다.

- 로컬 `.env`
- 시놀로지 Docker 환경변수
- 별도 비밀값 관리 방식

`*.env.example` 파일에는 예시 키 이름만 두고, 실제 값은 넣지 않습니다.

## 현재 상태

이미 반영된 항목:

- `application-dev.yml`, `application-prod.yml` 분리
- `prod`에서 PostgreSQL 설정 뼈대 추가
- `prod`에서 MinIO Fast/Cold 설정 뼈대 추가
- MinIO 업로드 서비스 골격 추가
- 업로드 시 이미지 메타데이터 저장 테이블 추가
- AI 생성 이력 저장 테이블 추가

아직 해야 할 항목:

- 시놀로지용 Docker 구성
- 실제 `prod` 환경변수 값 채우기
- 프론트 연동 확인
- 운영 보안/도메인 정리

## 실사용 전환 체크리스트

### 1. 환경변수 정리

- [ ] `backend/.env`에 들어 있는 실제 민감값이 Git에 올라가지 않는지 확인
- [ ] `backend/.env.example`는 예시값만 남기고 실제 비밀번호/토큰 제거
- [ ] `prod`용 PostgreSQL 값 준비
  - `DATABASE_URL`
  - `DATABASE_USERNAME`
  - `DATABASE_PASSWORD`
- [ ] `prod`용 MinIO Fast 값 준비
  - `MINIO_FAST_ENDPOINT`
  - `MINIO_FAST_PUBLIC_BASE_URL`
  - `MINIO_FAST_ACCESS_KEY`
  - `MINIO_FAST_SECRET_KEY`
  - `MINIO_FAST_BUCKET`
- [ ] `prod`용 MinIO Cold 값 준비
  - `MINIO_COLD_ENDPOINT`
  - `MINIO_COLD_PUBLIC_BASE_URL`
  - `MINIO_COLD_ACCESS_KEY`
  - `MINIO_COLD_SECRET_KEY`
  - `MINIO_COLD_BUCKET`
- [ ] OAuth, 메일, AI 연동 키를 시놀로지 환경변수로 분리

### 2. 데이터베이스 (PostgreSQL)

- [ ] 시놀로지에 PostgreSQL 컨테이너 생성
- [ ] PostgreSQL 데이터 경로를 NVMe 볼륨으로 지정
- [ ] DB 이름, 계정, 비밀번호 생성
- [ ] `prod`에서 DB 연결 테스트
- [ ] JPA가 `media_files`, `ai_generation_history` 테이블을 정상 생성하는지 확인
- [ ] 기존 dev(H2) 데이터가 필요하면 마이그레이션 여부 결정

### 3. 파일 저장소 (MinIO)

- [ ] 시놀로지에 MinIO Fast 컨테이너 생성
- [ ] Fast 데이터 경로를 NVMe 볼륨으로 지정
- [ ] 시놀로지에 MinIO Cold 컨테이너 생성
- [ ] Cold 데이터 경로를 일반 HDD 볼륨으로 지정
- [ ] Fast/Cold 각각 접속 URL 확인
- [ ] Fast/Cold 각각 버킷 확인
- [ ] 업로드 시 아래 구조로 저장되는지 확인
  - `invitations/original/...`
  - `invitations/thumb/...`
  - `invitations/analysis/...`
- [ ] 원본은 Cold, 썸네일/분석본은 Fast로 들어가는지 확인

### 4. 백엔드 실행 설정

- [ ] `SPRING_PROFILES_ACTIVE=prod` 로 실행되도록 설정
- [ ] `prod`에서 H2 콘솔이 비활성화되는지 확인
- [ ] `prod`에서 로컬 업로드 경로 의존이 최소화되는지 확인
- [ ] `prod`에서 MinIO 설정이 없을 때 실수로 로컬 저장으로 가지 않도록 운영 점검
- [ ] 운영 로그에 민감정보가 남지 않는지 확인

### 5. 프론트 연동

- [ ] 업로드 응답의 `mediaFileId`를 프론트에서 저장하도록 반영
- [ ] 업로드 응답의 `analysisImageUrl`를 AI 요청에 넘기도록 반영
- [ ] AI 요청 시 `sourceImageId`를 같이 보내도록 반영
- [ ] 업로드 후 대표 이미지/썸네일 표시가 기존처럼 정상 동작하는지 확인
- [ ] MinIO URL이 브라우저에서 정상 접근되는지 확인

### 6. 보안

- [ ] `backend/.env` 실제 비밀값 재점검
- [ ] GitHub/Gitea에 민감값이 이미 올라간 적이 있으면 즉시 교체
- [ ] 운영 CORS 도메인을 실제 서비스 도메인 기준으로 제한
- [ ] 개발용 허용 주소(`localhost`, 내부 임시 주소) 정리 여부 검토
- [ ] JWT 비밀키를 운영용 안전한 값으로 교체
- [ ] MinIO 콘솔 접근 계정 보호
- [ ] PostgreSQL 외부 노출 여부 최소화

### 7. 시놀로지 배포

- [ ] `docker-compose` 또는 시놀로지 Container Manager 기준 배포 방식 확정
- [ ] 백엔드 컨테이너 생성
- [ ] PostgreSQL 컨테이너 생성
- [ ] MinIO Fast 컨테이너 생성
- [ ] MinIO Cold 컨테이너 생성
- [ ] 각 컨테이너 재시작 정책 설정
- [ ] 볼륨 마운트 경로 최종 점검
- [ ] 내부 네트워크 연결 점검

### 8. 검증

- [ ] 회원가입 / 로그인 정상 동작
- [ ] 초대장 저장 정상 동작
- [ ] 이미지 업로드 정상 동작
- [ ] 업로드 후 PostgreSQL에 `media_files` 기록 생성 확인
- [ ] AI 생성 후 PostgreSQL에 `ai_generation_history` 기록 생성 확인
- [ ] 모바일 화면에서 대표 이미지/앨범/썸네일 정상 표시
- [ ] 재부팅 후 데이터가 유지되는지 확인

## 권장 작업 순서

1. 시놀로지에 PostgreSQL 준비
2. 시놀로지에 MinIO Fast / Cold 준비
3. `prod` 환경변수 확정
4. 백엔드 `prod` 실행 테스트
5. 프론트 업로드/AI 연동 확인
6. 실제 도메인/CORS/보안 정리
7. 최종 배포 점검

## 메모

- 개발 환경은 계속 `dev`로 유지하고, 실서비스 배포에서만 `prod`를 사용합니다.
- 지금 구조는 "개발용을 버리는 것"이 아니라, "개발과 운영을 분리해서 둘 다 지원"하는 방식입니다.
