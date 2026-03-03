# API 명세서

## 1. 인증(Authentication)

### 1.1 회원가입 및 이메일 인증 코드 발송
**POST** `/api/auth/register/send-code`

**요청 형식:**
```json
{
  "email": "string"
}
```

**응답 형식:**
```json
{
  "success": true,
  "message": "string"
}
```

### 1.2 회원가입
**POST** `/api/auth/register`

**요청 형식:**
```json
{
  "email": "string",
  "password": "string",
  "verificationCode": "string"
}
```

**응답 형식:**
```json
{
  "success": true,
  "message": "string"
}
```

### 1.3 로그인
**POST** `/api/auth/login`

**요청 형식:**
```json
{
  "email": "string",
  "password": "string"
}
```

**응답 형식:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

### 1.4 토큰 갱신
**POST** `/api/auth/refresh-token`

**요청 형식:**
```json
{
  "refreshToken": "string"
}
```

**응답 형식:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### 1.5 소셜 로그인 (구글)
**POST** `/api/auth/social/google`

**요청 형식:**
```json
{
  "idToken": "string"
}
```

**응답 형식:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

### 1.6 소셜 로그인 (네이버)
**POST** `/api/auth/social/naver`

**요청 형식:**
```json
{
  "code": "string",
  "state": "string",
  "redirectUri": "string"
}
```

### 1.7 소셜 로그인 (카카오)
**POST** `/api/auth/social/kakao`

**요청 형식:**
```json
{
  "code": "string",
  "state": "string",
  "redirectUri": "string"
}
```

### 1.8 관리자 권한 부여
**POST** `/api/auth/promote-admin`

**요청 형식:**
```json
{
  "email": "string"
}
```

### 1.9 사용자 권한 확인
**GET** `/api/auth/check-role?email=string`

**응답 형식:**
```json
{
  "email": "string",
  "found": true,
  "role": "string"
}
```

### 1.10 현재 사용자 정보 조회
**GET** `/api/auth/me`

**응답 형식:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

## 2. 초대장(Invitations)

### 2.1 내 초대장 목록 조회
**GET** `/api/invitations/my`

### 2.2 초대장 슬러그로 조회
**GET** `/api/invitations/slug/{slug}`

### 2.3 초대장 ID로 조회
**GET** `/api/invitations/{id}`

### 2.4 초대장 삭제
**DELETE** `/api/invitations/{id}`

### 2.5 초대장 생성/수정
**POST** `/api/invitations`

**요청 형식:**
```json
{
  "title": "string",
  "description": "string",
  "date": "string",
  "time": "string",
  "location": "string",
  "groomName": "string",
  "brideName": "string",
  "message": "string",
  "imageId": "string"
}
```

### 2.6 파일 업로드
**POST** `/api/invitations/upload`

**요청 형식:** multipart/form-data

### 2.7 AI로 이미지 생성 (참조 이미지를 기반으로)
**POST** `/api/invitations/ai-generate-from-image`

**요청 형식:**
```json
{
  "sourceImageId": "string",
  "analysisImageUrl": "string",
  "photoUrl": "string",
  "imageStyle": "string",
  "modelAlias": "string"
}
```

### 2.8 AI로 이미지 생성 (프롬프트를 기반으로)
**POST** `/api/invitations/ai-generate-from-prompt`

**요청 형식:**
```json
{
  "prompt": "string",
  "sourceImageId": "string",
  "analysisImageUrl": "string",
  "photoUrl": "string",
  "imageStyle": "string",
  "modelAlias": "string"
}
```

### 2.9 방명록 추가
**POST** `/api/invitations/{id}/guestbook`

**요청 형식:**
```json
{
  "writerName": "string",
  "content": "string"
}
```

### 2.10 참석 여부 등록
**POST** `/api/invitations/{id}/attendance`

**요청 형식:**
```json
{
  "name": "string",
  "side": "string",
  "attending": true,
  "count": 1,
  "meal": true,
  "mealCount": 1,
  "message": "string"
}
```

## 3. 관리자(Admin)

### 3.1 관리자 API
**POST** `/api/admin/...` (컨트롤러에 구현된 경로들)
