# VibeCard 개발 가이드 - 실제 코드 포함 완벽 흐름

> 직접 따라치면서 공부하는 가이드
> 0단계(환경 설정)부터 배포까지 모든 과정을 포함

---

## STEP 0: 개발 환경 세팅

### 0-1. 시놀로지 Code Server 접속

1. 시놀로지 NAS 패키지 센터에서 **Docker** 설치 (이미 설치되어 있다면 스킵)
2. **Code Server** 컨테이너 실행 (이미 실행 중이라면 스킵)
3. 브라우저에서 Code Server 접속: `http://시놀로지IP:포트`

### 0-2. 터미널에서 필수 패키지 설치 확인

Code Server 터미널(`` Ctrl+` ``)을 열고 확인:

```bash
java -version     # OpenJDK 17 이상
node -v           # v18 이상
npm -v            # 9 이상
git --version     # git 2.x
```

만약 설치가 안 되어 있다면 (Code Server 컨테이너 내부 기준):

```bash
# Debian/Ubuntu 기반 컨테이너인 경우
sudo apt update

# Java 17
sudo apt install -y openjdk-17-jdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Node.js 18+ (nvm 사용)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Git (보통 기본 설치됨)
sudo apt install -y git
```

> **시놀로지 Docker가 아닌 경우** (직접 SSH 접속):
> ```bash
> # opkg 또는 entware 사용
> sudo opkg install openjdk17
> sudo opkg install node
> ```

### 0-3. Code Server 확장팩 설치

Code Server 왼쪽 사이드바 확장(Extensions) 아이콘 클릭 → 아래 검색 후 Install:

```
1. Extension Pack for Java          ← Java 개발 필수 (Lombok 포함)
2. Spring Boot Extension Pack       ← Spring Boot 지원
3. ES7+ React/Redux/React-Native    ← React 컴포넌트 스니펫 자동완성
4. Tailwind CSS IntelliSense        ← Tailwind 자동완성
```

> **참고:** Code Server에서 일부 확장팩이 설치 안 될 수 있습니다.
> 그 경우 Open VSX (https://open-vsx.org) 에서 .vsix 파일 다운로드 후 수동 설치:
> Extensions → `...` 메뉴 → "Install from VSIX..."

### 0-4. 프로젝트 폴더 생성

Code Server 터미널(`` Ctrl+` ``)에서 실행:

```bash
# 시놀로지 공유 폴더 내에 프로젝트 생성 (경로는 본인 환경에 맞게 수정)
mkdir -p /volume1/develop/WEDDING_WEB
cd /volume1/develop/WEDDING_WEB

# Git 초기화
git init

# docs 폴더 생성
mkdir docs
```

> **경로 팁:** 시놀로지에서 보통 `/volume1/` 아래에 공유 폴더가 있습니다.
> Docker 컨테이너라면 마운트된 경로를 사용하세요 (예: `/config/workspace/WEDDING_WEB`)

### 0-5. `.gitignore` 작성

루트에 `.gitignore` 파일 생성:

```
# Java / Gradle
backend/build/
backend/.gradle/
backend/data/
backend/uploads/
backend/.env
backend/bin/

# Node
frontend/node_modules/
frontend/dist/

# Environment
.env.prod
*.log

# IDE
.vscode/
.idea/
*.iml
.DS_Store
```

---

## STEP 1-A: 백엔드 - Spring Boot 프로젝트 생성

> **두 가지 방법 중 하나 선택**

### 방법 A: Code Server 내에서 생성

> Spring Boot Extension Pack이 설치되어 있어야 합니다.

1. `Ctrl + Shift + P` (또는 `F1`)
2. **"Spring Initializr: Create a Gradle Project"** 입력 후 선택
3. 순서대로 선택/입력:

```
Spring Boot version → 3.5.11 (또는 목록에서 가장 높은 안정 버전, SNAPSHOT 제외)
Language            → Java
Group Id            → com.wedding
Artifact Id         → api
Packaging type      → Jar
Java version        → 17
```

> **버전 선택 팁:** SNAPSHOT, M2 등은 개발 중인 불안정 버전이므로 피하세요.
> 목록에서 숫자만 있는 것 중 가장 높은 버전을 선택하면 됩니다. (예: 3.5.11, 4.0.3)

4. **의존성 선택** (검색해서 Space로 체크, 다 고르면 Enter):

```
✅ Spring Web              → REST API 만들기 (@RestController, @GetMapping 등)
✅ Spring Data JPA         → DB 연동 (Entity → 테이블 자동 생성, Repository로 CRUD)
✅ Spring Security         → 인증/인가 (로그인, JWT, 권한 체크)
✅ Validation              → 입력값 검증 (@NotNull, @Email 등)
✅ Java Mail Sender        → 이메일 발송 (회원가입 인증코드 전송)
✅ Lombok                  → 반복 코드 자동 생성 (@Getter, @Setter, @Builder 등)
✅ H2 Database             → 개발용 내장 DB (파일 하나로 동작, 설치 불필요)
✅ PostgreSQL Driver       → 프로덕션용 DB 연결 (배포 시 사용)
```

5. 저장 위치로 `WEDDING_WEB` 폴더 선택
6. 생성된 폴더 이름 변경:

```bash
cd /volume1/develop/WEDDING_WEB
mv api backend
```

### 방법 B: start.spring.io에서 생성 후 업로드 (방법 A가 안 될 때만)

1. 브라우저에서 https://start.spring.io 접속
2. 설정:
   - **Project**: Gradle - Groovy
   - **Language**: Java
   - **Spring Boot**: 3.5.11 (또는 최신 안정 버  - **Group**: com.wedding
   - **Artifact**: api
   - **Name**: api
   - **Package name**: com.wedding.api
   - **Packaging**: Jar
   - **Java**: 17
3. **ADD DEPENDENCIES** 버튼 클릭 → 위와 같은 의존성 8개 추가
4. **GENERATE** 버튼 → zip 다운로드 (PC에 다운됨)
5. 시놀로지에 업로드 후 압축 풀기:

```bash
cd /volume1/develop/WEDDING_WEB

# 방법 1: 시놀로지 File Station으로 zip 업로드 후 터미널에서 풀기
unzip api.zip
mv api backend

# 방법 2: PC에서 scp로 직접 전송
# (PC 터미널에서) scp api.zip 유저명@시놀로지IP:/volume1/develop/WEDDING_WEB/
# (시놀로지에서) unzip api.zip && mv api backend
```

### 생성 확인

```bash
cd /volume1/develop/WEDDING_WEB/backend
ls -la
# build.gradle, gradlew, settings.gradle, src/ 등이 보여야 함
```

### JWT, MinIO 의존성 수동 추가

자동 생성된 `build.gradle`을 열어서 `dependencies` 블록에 추가:

```groovy
// JWT 토큰
implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'

// MinIO (S3 호환 스토리지)
implementation 'io.minio:minio:8.5.17'
```

### 첫 빌드 확인

```bash
cd /volume1/develop/WEDDING_WEB/backend

# gradlew 실행 권한 부여 (처음 한 번만)
chmod +x gradlew

# 빌드
./gradlew build

# BUILD SUCCESSFUL 이 나오면 성공!
```

---

## STEP 1-B: 프론트엔드 - React + Vite 프로젝트 생성

### 프로젝트 생성

> **주의: 반드시 프로젝트 루트(WEDDING_WEB)에서 실행!**
> frontend 폴더 안에서 실행하면 frontend/frontend/ 이중 폴더가 생깁니다.

```bash
# 반드시 프로젝트 루트로 이동 (backend와 같은 레벨)
cd /volume1/develop/WEDDING_WEB

# Vite + React 프로젝트 생성 ("frontend"라는 이름의 폴더가 자동 생성됨)
npm create vite@latest frontend -- --template react
# → "Ok to proceed? (y)" → y
# → "Use Vite 8 beta?" → No (안정 버전 사용) 또는 Yes (상관없음)
# → "Install with npm and start now?" → Yes

# 폴더로 이동 후 패키지 설치 (위에서 자동 설치됐으면 스킵)
cd frontend
npm install
```

### 추가 패키지 설치

```bash
# 라우팅, HTTP 통신, 아이콘
npm install react-router-dom axios lucide-react
# react-router-dom → 페이지 이동 (/login, /dashboard 등 URL 라우팅)
# axios            → 백엔드 API 호출 (토큰 자동 첨부, 에러 처리 편리)
# lucide-react     → 아이콘 모음 (메뉴, 삭제, 편집 등 SVG 아이콘)

# Tailwind CSS (스타일링)
npm install -D tailwindcss @tailwindcss/vite
# tailwindcss      → 클래스명만으로 디자인 ("text-xl font-bold bg-gray-50")
# @tailwindcss/vite → Vite에서 Tailwind가 동작하게 연결하는 플러그인
```

### `frontend/vite.config.js` 수정

자동 생성된 파일을 아래 내용으로 교체:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

### `frontend/index.html` 수정

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VibeCard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `frontend/src/index.css` 수정

```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

### `frontend/src/main.jsx` 수정

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

### `frontend/src/App.jsx` 수정

```jsx
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <h1 className="text-3xl font-bold text-gray-800">VibeCard 🎉</h1>
        </div>
      } />
    </Routes>
  )
}

export default App
```

### 첫 실행 확인

```bash
cd /volume1/develop/WEDDING_WEB/frontend
npm run dev
# → http://시놀로지IP:3000 에서 "VibeCard 🎉" 이 보이면 성공!
# (vite.config.js에서 host: true 설정 필요 - 아래 참고)
```

> **시놀로지에서 외부 접속하려면** `vite.config.js`의 server에 `host: true` 추가 필요:
> ```javascript
> server: {
>   port: 3000,
>   host: true,  // ← 이거 추가해야 외부에서 접속 가능
>   ...
> }
> ```

### 환경변수 파일 생성

`frontend` 폴더 안에 아래 2개 파일을 Code Server에서 직접 생성:

**`frontend/.env.development`**
```
VITE_GOOGLE_CLIENT_ID=
VITE_NAVER_CLIENT_ID=
VITE_KAKAO_REST_API_KEY=
VITE_KAKAO_MAP_JS_KEY=
```

**`frontend/.env.production`**
```
VITE_GOOGLE_CLIENT_ID=
VITE_NAVER_CLIENT_ID=
VITE_KAKAO_REST_API_KEY=
VITE_KAKAO_MAP_JS_KEY=
```

---

## STEP 1-C: 전체 폴더 구조 확인

여기까지 완료하면 아래와 같은 구조:

```
/volume1/develop/WEDDING_WEB/
├── .gitignore
├── docs/
├── backend/                    ← Spring Boot
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradlew
│   ├── gradle/wrapper/
│   └── src/
│       └── main/
│           ├── java/com/wedding/api/
│           │   └── WeddingApplication.java  ← 자동 생성됨
│           └── resources/
│               └── application.properties   ← yml로 교체할 예정
└── frontend/                   ← React + Vite
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.development
    ├── .env.production
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

### application.properties → application.yml 전환

Spring Initializr가 `application.properties`를 자동 생성하는데, yml이 더 편합니다:

1. `backend/src/main/resources/application.properties` 삭제
2. 같은 위치에 아래 3개 파일을 Code Server에서 새로 만들기 (내용은 STEP 2에서 작성):
   - `application.yml`
   - `application-dev.yml`
   - `application-prod.yml`

### 패키지(폴더) 구조 생성

`backend\src\main\java\com\wedding\api\` 아래에 7개 폴더 생성:

**방법 1: Code Server에서 직접 만들기**
- 왼쪽 탐색기에서 `com/wedding/api` 우클릭 → "New Folder" → 이름 입력
- `config`, `controller`, `dto`, `entity`, `repository`, `security`, `service` 각각 생성

**방법 2: 터미널에서 한 번에**
```bash
cd /volume1/develop/WEDDING_WEB/backend/src/main/java/com/wedding/api
mkdir -p config controller dto entity repository security service
```

생성 후 확인:

```
com/wedding/api/
├── WeddingApplication.java  ← 자동 생성됨
├── config/
├── controller/
├── dto/
├── entity/
├── repository/
├── security/
└── service/
```

> ✅ **여기까지 완료!** 이제 STEP 2(YAML 설정)부터 코드를 작성하면 됩니다.
> 아래부터는 파일별로 코드를 직접 작성하는 단계입니다.

---

## STEP 1: Gradle 빌드 파일 확인/수정

> Spring Initializr가 자동 생성한 파일을 확인하고, 필요하면 아래 내용으로 맞춰주세요.

### 1-1. `backend/settings.gradle`

```groovy
rootProject.name = 'wedding-api'
```

### 1-2. `backend/build.gradle`

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.4.3'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.wedding'
version = '0.1.0'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-mail'
    implementation 'io.minio:minio:8.5.17'

    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'

    runtimeOnly 'com.h2database:h2'
    runtimeOnly 'org.postgresql:postgresql'

    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

---

## STEP 2: 리소스 설정 파일

### 2-1. `src/main/resources/application.yml`

```yaml
server:
  port: 8080

spring:
  profiles:
    default: dev
  config:
    import: optional:file:.env[.properties]
  jpa:
    show-sql: false
    properties:
      hibernate:
        format_sql: true
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
  mail:
    host: ${MAIL_HOST:}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

jwt:
  secret: nlQgse9klW1Ye3x6vDnPdK/c//YNTsLh6GFbl2JniBM=aSecureKeyThatIsLongEnoughForHS256
  expiration: 3600000

security:
  oauth:
    google:
      client-id: ${GOOGLE_CLIENT_ID:}
    naver:
      client-id: ${NAVER_CLIENT_ID:}
      client-secret: ${NAVER_CLIENT_SECRET:}
    kakao:
      rest-api-key: ${KAKAO_REST_API_KEY:}
      client-secret: ${KAKAO_CLIENT_SECRET:}

openclaw:
  base-url: ${OPENCLAW_BASE_URL:}
  auth:
    type: ${OPENCLAW_AUTH_TYPE:bearer}
    header: ${OPENCLAW_AUTH_HEADER:Authorization}
    token: ${OPENCLAW_AUTH_TOKEN:}
    token-openclaw1: ${OPENCLAW_AUTH_TOKEN_OPENCLAW1:}
    token-openclaw2: ${OPENCLAW_AUTH_TOKEN_OPENCLAW2:}
    token-openclaw3: ${OPENCLAW_AUTH_TOKEN_OPENCLAW3:}
  mode: ${OPENCLAW_MODE:single_endpoint}
  chat-path: ${OPENCLAW_CHAT_PATH:/v1/chat/completions}
  path:
    openclaw1: ${OPENCLAW_PATH_OPENCLAW1:}
    openclaw2: ${OPENCLAW_PATH_OPENCLAW2:}
    openclaw3: ${OPENCLAW_PATH_OPENCLAW3:}
  url:
    openclaw1: ${OPENCLAW_URL_OPENCLAW1:}
    openclaw2: ${OPENCLAW_URL_OPENCLAW2:}
    openclaw3: ${OPENCLAW_URL_OPENCLAW3:}
  model:
    openclaw1: ${OPENCLAW_MODEL_OPENCLAW1:openclaw1}
    openclaw2: ${OPENCLAW_MODEL_OPENCLAW2:openclaw2}
    openclaw3: ${OPENCLAW_MODEL_OPENCLAW3:openclaw3}
    openclaw3-general: ${OPENCLAW_MODEL_OPENCLAW3_GENERAL:}
    openclaw3-coding: ${OPENCLAW_MODEL_OPENCLAW3_CODING:}
    openclaw3-vision: ${OPENCLAW_MODEL_OPENCLAW3_VISION:}
  ollama-url:
    openclaw3: ${OPENCLAW_OLLAMA_URL_OPENCLAW3:}
  ollama-unload-after-vision: ${OPENCLAW_OLLAMA_UNLOAD_AFTER_VISION:true}

openai:
  base-url: ${OPENAI_BASE_URL:https://api.openai.com/v1}
  api-key: ${OPENAI_API_KEY:}
  vision-model: ${OPENAI_VISION_MODEL:gpt-4.1-mini}

storage:
  minio:
    fast:
      endpoint: ${MINIO_FAST_ENDPOINT:}
      public-base-url: ${MINIO_FAST_PUBLIC_BASE_URL:}
      access-key: ${MINIO_FAST_ACCESS_KEY:}
      secret-key: ${MINIO_FAST_SECRET_KEY:}
      bucket: ${MINIO_FAST_BUCKET:}
    cold:
      endpoint: ${MINIO_COLD_ENDPOINT:}
      public-base-url: ${MINIO_COLD_PUBLIC_BASE_URL:}
      access-key: ${MINIO_COLD_ACCESS_KEY:}
      secret-key: ${MINIO_COLD_SECRET_KEY:}
      bucket: ${MINIO_COLD_BUCKET:}

upload:
  dir: ${UPLOAD_DIR:/app/uploads}
```

### 2-2. `src/main/resources/application-dev.yml`

```yaml
spring:
  datasource:
    url: jdbc:h2:file:${user.home}/.wedding-dev/data/wedding
    driver-class-name: org.h2.Driver
    username: sa
    password:
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    hibernate:
      ddl-auto: update

upload:
  dir: ${UPLOAD_DIR:./uploads}
```

### 2-3. `src/main/resources/application-prod.yml`

```yaml
spring:
  config:
    import: optional:file:../.env.prod[.properties]
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: ${JPA_DDL_AUTO:update}
```

---

## STEP 3: 메인 애플리케이션

### 3-1. `WeddingApplication.java`

```java
package com.wedding.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class WeddingApplication {
    public static void main(String[] args) {
        SpringApplication.run(WeddingApplication.class, args);
    }
}
```

> ✅ 여기까지 하면 `./gradlew bootRun`으로 서버 기동 확인 가능
> 시놀로지에서는 `http://시놀로지IP:8080`으로 접속 (Security가 있어서 자동 로그인 페이지 뜸)

---

## STEP 4: Entity (10개)

> **가장 먼저 만드는 이유**: Repository, Service, Controller가 모두 Entity에 의존

### 4-1. `entity/User.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_provider_provider_id", columnNames = {"provider", "provider_id"})
        }
)
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String provider;
    @Column(name = "provider_id")
    private String providerId;

    @Builder.Default
    private String role = "USER";

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Invitation> invitations = new ArrayList<>();
}
```

### 4-2. `entity/Invitation.java`

```java
package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(nullable = false)
    private String groomName;

    @Column(nullable = false)
    private String brideName;

    @Column(nullable = false)
    private LocalDateTime weddingDate;

    @Column(nullable = false)
    private String venueName;

    @Column(nullable = false)
    private String venueAddress;

    private String mainPhotoUrl;

    @Builder.Default
    private String mainPhotoFit = "cover";

    @Builder.Default
    private String mainPhotoPosition = "50% 50%";

    @Builder.Default
    private String template = "modern";

    private String skinId;
    private String invitationTitle;

    @Column(length = 2000)
    @Builder.Default
    private String invitationMessage = "저희 두 사람, 하나가 되는 소중한 날에\n초대합니다. 오셔서 축복해 주세요.";

    private String groomFather;
    private String groomMother;
    @Builder.Default
    private String groomRelation = "장남";
    private String groomPhone;
    private String groomFatherPhone;
    private String groomMotherPhone;

    private String brideFather;
    private String brideMother;
    @Builder.Default
    private String brideRelation = "장녀";
    private String bridePhone;
    private String brideFatherPhone;
    private String brideMotherPhone;

    @Column(length = 5000)
    @Builder.Default
    private String albumPhotos = "[]";

    @Column(length = 5000)
    @Builder.Default
    private String config = "{}";

    @Builder.Default
    private Boolean isPublished = true;

    private String youtubeUrl;
    private String bgmUrl;

    @Builder.Default
    private String noticeTitle = "알림 사항";
    private String noticeContent;

    @Builder.Default
    private Boolean dDayEnabled = true;

    @Builder.Default
    private Boolean navigationEnabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BankAccount> bankAccounts = new ArrayList<>();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Guestbook> guestbook = new ArrayList<>();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Attendance> attendance = new ArrayList<>();
}
```

### 4-3. `entity/Skin.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Skin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    @Column(unique = true)
    private String slug;

    private String description;

    @Column(length = 5000)
    @Builder.Default
    private String config = "{}";

    private String thumbnail;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### 4-4. `entity/RefreshToken.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(nullable = false)
    private LocalDateTime expiryDate;
}
```

### 4-5. `entity/Guestbook.java`

```java
package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Guestbook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String writerName;

    @Column(length = 2000)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    @JsonIgnore
    private Invitation invitation;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### 4-6. `entity/Attendance.java`

```java
package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String side;
    private Boolean attending;

    @Builder.Default
    private Integer count = 1;

    private Boolean meal;
    @Builder.Default
    private Integer mealCount = 0;
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    @JsonIgnore
    private Invitation invitation;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### 4-7. `entity/BankAccount.java`

```java
package com.wedding.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ownerType;
    private String bankName;
    private String accountNumber;
    private String ownerName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    @JsonIgnore
    private Invitation invitation;
}
```

### 4-8. `entity/MediaFile.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "media_files")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class MediaFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "storage_mode", nullable = false, length = 20)
    private String storageMode;

    @Column(name = "original_bucket")
    private String originalBucket;

    @Column(name = "original_object_key", length = 500)
    private String originalObjectKey;

    @Column(name = "original_url", nullable = false, length = 1000)
    private String originalUrl;

    @Column(name = "thumb_bucket")
    private String thumbBucket;

    @Column(name = "thumb_object_key", length = 500)
    private String thumbObjectKey;

    @Column(name = "thumb_url", length = 1000)
    private String thumbUrl;

    @Column(name = "analysis_bucket")
    private String analysisBucket;

    @Column(name = "analysis_object_key", length = 500)
    private String analysisObjectKey;

    @Column(name = "analysis_url", length = 1000)
    private String analysisUrl;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    private Integer width;
    private Integer height;

    @Column(name = "file_size")
    private Long fileSize;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### 4-9. `entity/AiGenerationHistory.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_generation_history")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AiGenerationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "source_image_id")
    private String sourceImageId;

    @Column(name = "source_image_url", length = 1000)
    private String sourceImageUrl;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "result_summary", length = 4000)
    private String resultSummary;

    @Column(name = "config_patch_json", length = 10000)
    private String configPatchJson;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### 4-10. `entity/AiPromptBlockLog.java`

```java
package com.wedding.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_prompt_block_logs")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AiPromptBlockLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(nullable = false, length = 2000)
    private String prompt;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

> ✅ Entity 10개 완성! 다음은 Repository

---

## STEP 5: Repository (10개)

> **Entity를 DB에 저장/조회하는 인터페이스. JpaRepository를 상속하면 기본 CRUD 자동 생성**

### 5-1. `repository/UserRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
    boolean existsByEmail(String email);
    void deleteByEmail(String email);
}
```

### 5-2. `repository/InvitationRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, String> {
    List<Invitation> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Invitation> findBySlug(String slug);
    List<Invitation> findTop10ByOrderByCreatedAtDesc();
}
```

### 5-3. `repository/SkinRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.Skin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SkinRepository extends JpaRepository<Skin, String> {
    List<Skin> findAllByOrderByCreatedAtDesc();
    List<Skin> findByIsActiveTrueOrderByCreatedAtDesc();
    Optional<Skin> findBySlug(String slug);
}
```

### 5-4. `repository/RefreshTokenRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.RefreshToken;
import com.wedding.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(User user);
    @Modifying
    int deleteByUser(User user);
}
```

### 5-5. `repository/GuestbookRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.Guestbook;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestbookRepository extends JpaRepository<Guestbook, Long> {
}
```

### 5-6. `repository/AttendanceRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
}
```

### 5-7. `repository/BankAccountRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    void deleteByInvitationId(String invitationId);
}
```

### 5-8. `repository/MediaFileRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaFileRepository extends JpaRepository<MediaFile, String> {
}
```

### 5-9. `repository/AiGenerationHistoryRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.AiGenerationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiGenerationHistoryRepository extends JpaRepository<AiGenerationHistory, String> {
}
```

### 5-10. `repository/AiPromptBlockLogRepository.java`

```java
package com.wedding.api.repository;

import com.wedding.api.entity.AiPromptBlockLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiPromptBlockLogRepository extends JpaRepository<AiPromptBlockLog, String> {
    List<AiPromptBlockLog> findTop200ByOrderByCreatedAtDesc();
}
```

> ✅ Repository 10개 완성! 다음은 Security

---

## STEP 6: Security (2개)

> **JWT 토큰 생성/검증. Controller보다 먼저 만들어야 SecurityConfig에서 쓸 수 있음**

### 6-1. `security/JwtTokenProvider.java`

```java
package com.wedding.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expiration;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generateToken(String userId, String email, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiration))
                .signWith(key)
                .compact();
    }

    public String getUserId(String token) {
        return getClaims(token).getSubject();
    }

    public String getEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    public String getRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
```

### 6-2. `security/JwtAuthenticationFilter.java`

```java
package com.wedding.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || header.isBlank()) {
            header = request.getHeader("X-Forwarded-Authorization");
        }
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtTokenProvider.validateToken(token)) {
                String userId = jwtTokenProvider.getUserId(token);
                String role = jwtTokenProvider.getRole(token);
                if (role == null || role.isBlank()) role = "USER";
                else role = role.toUpperCase();

                var auth = new UsernamePasswordAuthenticationToken(
                        userId, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

> ✅ Security 2개 완성! 다음은 DTO

---

## STEP 7: DTO (9개)

> **Request/Response 데이터 전달 객체. Service, Controller에서 사용**

### 7-1. `dto/AuthRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String email;
    private String password;
    private String verificationCode;
}
```

### 7-2. `dto/AuthResponse.java`

```java
package com.wedding.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private boolean success;
    private String token;
    private String refreshToken;
    private UserDto user;
    private String error;

    public static AuthResponse ok(String token, String refreshToken, UserDto user) {
        return new AuthResponse(true, token, refreshToken, user, null);
    }

    public static AuthResponse fail(String error) {
        return new AuthResponse(false, null, null, null, error);
    }

    @Data
    @AllArgsConstructor
    public static class UserDto {
        private String id;
        private String email;
        private String role;
    }
}
```

### 7-3. `dto/InvitationRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class InvitationRequest {
    private String id;
    private String slug;
    private String groomName;
    private String brideName;
    private String weddingDate;
    private String venueName;
    private String venueAddress;
    private String mainPhotoUrl;
    private String mainPhotoFit;
    private String mainPhotoPosition;
    private String template;
    private String skinId;
    private String invitationTitle;
    private String invitationMessage;
    private String groomFather;
    private String groomMother;
    private String groomRelation;
    private String groomPhone;
    private String brideFather;
    private String brideMother;
    private String brideRelation;
    private String bridePhone;
    private String groomFatherPhone;
    private String groomMotherPhone;
    private String brideFatherPhone;
    private String brideMotherPhone;
    private String albumPhotos;
    private String config;
    private String youtubeUrl;
    private String bgmUrl;
    private String noticeTitle;
    private String noticeContent;
    private Boolean dDayEnabled;
    private Boolean navigationEnabled;
    private List<BankAccountDto> bankAccounts;

    @Data
    public static class BankAccountDto {
        private String ownerType;
        private String bankName;
        private String accountNumber;
        private String ownerName;
    }
}
```

### 7-4. `dto/SkinRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;

@Data
public class SkinRequest {
    private String name;
    private String slug;
    private String description;
    private String config;
    private String thumbnail;
}
```

### 7-5. `dto/SkinAiGenerateRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;

@Data
public class SkinAiGenerateRequest {
    private String prompt;
    private String template;
    private String model;
    private String localPurpose;
}
```

### 7-6. `dto/AdminUserDto.java`

```java
package com.wedding.api.dto;

import com.wedding.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDto {
    private String id;
    private String email;
    private String role;
    private LocalDateTime createdAt;

    public static AdminUserDto from(User user) {
        if (user == null) return null;
        return new AdminUserDto(user.getId(), user.getEmail(), user.getRole(), user.getCreatedAt());
    }
}
```

### 7-7. `dto/AiInvitationImageRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;

@Data
public class AiInvitationImageRequest {
    private String sourceImageId;
    private String photoUrl;
    private String analysisImageUrl;
    private String imageStyle;
    private String modelAlias;
}
```

### 7-8. `dto/AiInvitationImageResponse.java`

```java
package com.wedding.api.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class AiInvitationImageResponse {
    private boolean success;
    private String analysisSummary;
    private String colorStrategy;
    private String congratulatoryMessage;
    private Map<String, Object> configPatch;
}
```

### 7-9. `dto/AiInvitationPromptRequest.java`

```java
package com.wedding.api.dto;

import lombok.Data;

@Data
public class AiInvitationPromptRequest {
    private String sourceImageId;
    private String prompt;
    private String photoUrl;
    private String analysisImageUrl;
    private String imageStyle;
    private String modelAlias;
}
```

> ✅ DTO 9개 완성! 다음은 Service

---

## STEP 8: Service (7개 - 핵심)

> **비즈니스 로직. Repository를 주입받아서 실제 동작 구현**

### 8-1. `service/EmailVerificationService.java`

```java
package com.wedding.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {
    private static final long CODE_EXPIRE_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long RESEND_COOLDOWN_MILLIS = Duration.ofSeconds(60).toMillis();
    private static final int MAX_VERIFY_ATTEMPTS = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    private final Map<String, VerificationState> verificationStore = new ConcurrentHashMap<>();

    public Result sendCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return Result.fail("이메일을 입력해 주세요.");

        long now = System.currentTimeMillis();
        VerificationState existing = verificationStore.get(normalizedEmail);
        if (existing != null && now - existing.lastSentAt() < RESEND_COOLDOWN_MILLIS) {
            return Result.fail("인증코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.");
        }

        String code = generateCode();
        long expiresAt = now + CODE_EXPIRE_MILLIS;
        verificationStore.put(normalizedEmail, new VerificationState(code, expiresAt, now, 0));

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) {
                message.setFrom(mailFrom);
            }
            message.setTo(normalizedEmail);
            message.setSubject("[VibeCard] 이메일 인증코드");
            message.setText("인증코드: " + code + "\n\n10분 이내에 입력해 주세요.");
            mailSender.send(message);
            return Result.ok("인증코드를 전송했습니다. 메일함을 확인해 주세요.");
        } catch (Exception e) {
            log.error("Failed to send verification email to {}", normalizedEmail, e);
            return Result.fail("인증 메일 전송에 실패했습니다. 메일 설정을 확인해 주세요.");
        }
    }

    public Result verifyCode(String email, String inputCode) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return Result.fail("이메일을 입력해 주세요.");
        if (inputCode == null || inputCode.isBlank()) return Result.fail("인증코드를 입력해 주세요.");

        VerificationState state = verificationStore.get(normalizedEmail);
        if (state == null) return Result.fail("먼저 인증코드 발송을 요청해 주세요.");

        long now = System.currentTimeMillis();
        if (now > state.expiresAt()) {
            verificationStore.remove(normalizedEmail);
            return Result.fail("인증코드가 만료되었습니다. 다시 요청해 주세요.");
        }
        if (state.attempts() >= MAX_VERIFY_ATTEMPTS) {
            verificationStore.remove(normalizedEmail);
            return Result.fail("인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.");
        }
        if (!state.code().equals(inputCode.trim())) {
            verificationStore.put(
                normalizedEmail,
                new VerificationState(state.code(), state.expiresAt(), state.lastSentAt(), state.attempts() + 1)
            );
            return Result.fail("인증코드가 올바르지 않습니다.");
        }
        return Result.ok("이메일 인증이 완료되었습니다.");
    }

    public void consumeVerifiedCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return;
        VerificationState state = verificationStore.get(normalizedEmail);
        if (state == null) return;
        if (state.code().equals(code != null ? code.trim() : "")) {
            verificationStore.remove(normalizedEmail);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateCode() {
        int n = RANDOM.nextInt(1_000_000);
        return String.format("%06d", n);
    }

    public record Result(boolean success, String message) {
        static Result ok(String message) { return new Result(true, message); }
        static Result fail(String message) { return new Result(false, message); }
    }

    private record VerificationState(String code, long expiresAt, long lastSentAt, int attempts) {}
}
```

### 8-2. `service/SignupRateLimitService.java`

```java
package com.wedding.api.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SignupRateLimitService {
    private static final int MAX_ATTEMPTS_PER_IP = 12;
    private static final int MAX_ATTEMPTS_PER_EMAIL = 5;
    private static final int MAX_SEND_CODE_PER_IP = 20;
    private static final int MAX_SEND_CODE_PER_EMAIL = 8;
    private static final long IP_WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long EMAIL_WINDOW_MILLIS = Duration.ofHours(1).toMillis();
    private static final long SEND_CODE_IP_WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final long SEND_CODE_EMAIL_WINDOW_MILLIS = Duration.ofHours(1).toMillis();

    private final ConcurrentHashMap<String, Deque<Long>> ipAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> emailAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> sendCodeIpAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Long>> sendCodeEmailAttempts = new ConcurrentHashMap<>();

    public boolean allowAttempt(String clientIp, String email) {
        long now = System.currentTimeMillis();
        return checkAndRecord(ipAttempts, normalizeIp(clientIp), now, IP_WINDOW_MILLIS, MAX_ATTEMPTS_PER_IP)
            && checkAndRecord(emailAttempts, normalizeEmail(email), now, EMAIL_WINDOW_MILLIS, MAX_ATTEMPTS_PER_EMAIL);
    }

    public boolean allowSendCode(String clientIp, String email) {
        long now = System.currentTimeMillis();
        return checkAndRecord(sendCodeIpAttempts, normalizeIp(clientIp), now, SEND_CODE_IP_WINDOW_MILLIS, MAX_SEND_CODE_PER_IP)
            && checkAndRecord(sendCodeEmailAttempts, normalizeEmail(email), now, SEND_CODE_EMAIL_WINDOW_MILLIS, MAX_SEND_CODE_PER_EMAIL);
    }

    private boolean checkAndRecord(ConcurrentHashMap<String, Deque<Long>> store, String key, long now, long windowMillis, int maxAttempts) {
        Deque<Long> timestamps = store.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMillis) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxAttempts) return false;
            timestamps.addLast(now);
            if (timestamps.isEmpty()) store.remove(key);
            return true;
        }
    }

    private String normalizeIp(String clientIp) {
        return (clientIp == null || clientIp.isBlank()) ? "unknown" : clientIp.trim();
    }

    private String normalizeEmail(String email) {
        return (email == null || email.isBlank()) ? "unknown" : email.trim().toLowerCase(Locale.ROOT);
    }
}
```

### 8-3. `service/RefreshTokenService.java`

```java
package com.wedding.api.service;

import com.wedding.api.entity.RefreshToken;
import com.wedding.api.entity.User;
import com.wedding.api.repository.RefreshTokenRepository;
import com.wedding.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final long refreshTokenExpirationDays = 14;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        String newTokenString = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusDays(refreshTokenExpirationDays);

        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .map(existing -> {
                    existing.setToken(newTokenString);
                    existing.setExpiryDate(expiry);
                    return existing;
                })
                .orElseGet(() -> RefreshToken.builder()
                        .user(user)
                        .token(newTokenString)
                        .expiryDate(expiry)
                        .build());

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    @Transactional
    public int deleteByUserId(String userId) {
        return userRepository.findById(userId)
                .map(refreshTokenRepository::deleteByUser)
                .orElse(0);
    }
}
```

### 8-4. `service/AuthService.java`

> **핵심 서비스 - 이메일 회원가입/로그인 + Google/Naver/Kakao 소셜 로그인**
> 코드가 길지만 전부 따라치세요!

```java
package com.wedding.api.service;

import com.wedding.api.dto.AuthResponse;
import com.wedding.api.entity.User;
import com.wedding.api.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wedding.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final int PASSWORD_MIN_LENGTH = 10;
    private static final int PASSWORD_MAX_LENGTH = 72;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PASSWORD_LETTER_PATTERN = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern PASSWORD_DIGIT_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern PASSWORD_SPECIAL_PATTERN = Pattern.compile(".*[^A-Za-z0-9].*");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final ObjectMapper objectMapper;
    private final EmailVerificationService emailVerificationService;

    @Value("${security.oauth.google.client-id:}")
    private String googleClientId;
    @Value("${security.oauth.naver.client-id:}")
    private String naverClientId;
    @Value("${security.oauth.naver.client-secret:}")
    private String naverClientSecret;
    @Value("${security.oauth.kakao.rest-api-key:}")
    private String kakaoRestApiKey;
    @Value("${security.oauth.kakao.client-secret:}")
    private String kakaoClientSecret;

    public AuthResponse register(String email, String password, String verificationCode) {
        String normalizedEmail = normalizeEmail(email);
        if (!isValidEmail(normalizedEmail))
            return AuthResponse.fail("올바른 이메일 형식을 입력해 주세요.");
        if (!isStrongPassword(password))
            return AuthResponse.fail("비밀번호는 10~72자이며 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.");

        EmailVerificationService.Result verifyResult = emailVerificationService.verifyCode(normalizedEmail, verificationCode);
        if (!verifyResult.success()) return AuthResponse.fail(verifyResult.message());

        User existingUser = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existingUser != null) {
            if (existingUser.getProvider() != null && !existingUser.getProvider().isBlank())
                return AuthResponse.fail("이미 " + providerLabel(existingUser.getProvider()) + "로 가입된 이메일입니다.");
            return AuthResponse.fail("이미 존재하는 이메일입니다.");
        }

        User user = User.builder().email(normalizedEmail).password(passwordEncoder.encode(password)).build();
        userRepository.save(user);
        emailVerificationService.consumeVerifiedCode(normalizedEmail, verificationCode);
        return new AuthResponse(true, null, null, new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole()), null);
    }

    @Transactional
    public void deleteAccount(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        refreshTokenService.deleteByUserId(userId);
        userRepository.delete(user);
    }

    public AuthResponse login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank() || password == null || password.isBlank())
            return AuthResponse.fail("이메일 또는 비밀번호가 올바르지 않습니다.");

        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user != null && user.getProvider() != null && !user.getProvider().isBlank())
            return AuthResponse.fail("해당 이메일은 " + providerLabel(user.getProvider()) + " 소셜 로그인 전용 계정입니다.");
        if (user == null || !passwordEncoder.matches(password, user.getPassword()))
            return AuthResponse.fail("이메일 또는 비밀번호가 올바르지 않습니다.");

        String role = (user.getRole() != null) ? user.getRole() : "USER";
        String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), role);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId()).getToken();
        return AuthResponse.ok(accessToken, refreshToken, new AuthResponse.UserDto(user.getId(), user.getEmail(), role));
    }

    public AuthResponse loginWithGoogleIdToken(String idToken) {
        GoogleProfile profile = verifyGoogleIdToken(idToken);
        if (profile == null) return AuthResponse.fail("구글 인증에 실패했습니다.");
        if (!profile.emailVerified()) return AuthResponse.fail("이메일 인증이 완료된 구글 계정만 사용할 수 있습니다.");
        return upsertSocialUserAndLogin("google", profile.sub(), profile.email());
    }

    public AuthResponse loginWithNaverCode(String code, String state, String redirectUri) {
        NaverVerifyResult verify = verifyNaverAuthorizationCode(code, state, redirectUri);
        if (!verify.success()) return AuthResponse.fail(verify.error());
        if (verify.profile().email() == null || verify.profile().email().isBlank())
            return AuthResponse.fail("네이버 계정에서 이메일 제공 동의가 필요합니다.");
        return upsertSocialUserAndLogin("naver", verify.profile().id(), verify.profile().email());
    }

    public AuthResponse loginWithKakaoCode(String code, String state, String redirectUri) {
        KakaoVerifyResult verify = verifyKakaoAuthorizationCode(code, state, redirectUri);
        if (!verify.success()) return AuthResponse.fail(verify.error());
        if (verify.profile().email() == null || verify.profile().email().isBlank())
            return AuthResponse.fail("카카오 계정에서 이메일 제공 동의가 필요합니다.");
        return upsertSocialUserAndLogin("kakao", verify.profile().id(), verify.profile().email());
    }

    private AuthResponse upsertSocialUserAndLogin(String provider, String providerId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) return AuthResponse.fail("소셜 계정 이메일 정보가 올바르지 않습니다.");

        User user;
        try {
            user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
            if (user == null) {
                user = userRepository.findByEmail(normalizedEmail).orElse(null);
                if (user != null) {
                    if (user.getProvider() == null || user.getProviderId() == null)
                        return AuthResponse.fail("이미 이메일로 가입된 계정입니다.");
                    if (!provider.equals(user.getProvider()) || !providerId.equals(user.getProviderId()))
                        return AuthResponse.fail("이미 다른 소셜 계정으로 가입된 이메일입니다.");
                } else {
                    user = User.builder()
                            .email(normalizedEmail)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .provider(provider).providerId(providerId).build();
                }
                user = userRepository.save(user);
            }
        } catch (Exception e) {
            return AuthResponse.fail("유저 정보 처리 중 오류: " + e.getMessage());
        }

        String role = (user.getRole() != null) ? user.getRole() : "USER";
        String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), role);
        String refreshToken = refreshTokenService.createRefreshToken(user.getId()).getToken();
        return AuthResponse.ok(accessToken, refreshToken, new AuthResponse.UserDto(user.getId(), user.getEmail(), role));
    }

    private GoogleProfile verifyGoogleIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) return null;
        try {
            String encoded = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            URI uri = URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encoded);
            HttpResponse<String> resp = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(uri).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            Map<String, Object> map = objectMapper.readValue(resp.body(), new TypeReference<>() {});
            String sub = stringOrEmpty(map.get("sub"));
            String em = stringOrEmpty(map.get("email"));
            boolean emailVerified = "true".equalsIgnoreCase(stringOrEmpty(map.get("email_verified")));
            if (sub.isBlank() || em.isBlank() || !emailVerified) return null;
            return new GoogleProfile(sub, em, emailVerified);
        } catch (Exception ignored) { return null; }
    }

    private NaverVerifyResult verifyNaverAuthorizationCode(String code, String state, String redirectUri) {
        if (code == null || code.isBlank()) return NaverVerifyResult.fail("네이버 code 값이 없습니다.");
        if (naverClientId == null || naverClientId.isBlank()) return NaverVerifyResult.fail("서버 NAVER_CLIENT_ID 설정이 비어 있습니다.");
        try {
            URI tokenUri = URI.create("https://nid.naver.com/oauth2.0/token?grant_type=authorization_code"
                    + "&client_id=" + URLEncoder.encode(naverClientId, StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(naverClientSecret, StandardCharsets.UTF_8)
                    + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8));
            HttpResponse<String> tokenResp = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(tokenUri).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (tokenResp.statusCode() != 200) return NaverVerifyResult.fail("네이버 토큰 교환 실패");
            Map<String, Object> tokenMap = objectMapper.readValue(tokenResp.body(), new TypeReference<>() {});
            String accessToken = stringOrEmpty(tokenMap.get("access_token"));
            if (accessToken.isBlank()) return NaverVerifyResult.fail("네이버 access_token이 비어 있습니다.");

            HttpResponse<String> profileResp = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create("https://openapi.naver.com/v1/nid/me"))
                            .header("Authorization", "Bearer " + accessToken).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            Map<String, Object> bodyMap = objectMapper.readValue(profileResp.body(), new TypeReference<>() {});
            Object responseObj = bodyMap.get("response");
            if (!(responseObj instanceof Map<?, ?> responseMapRaw)) return NaverVerifyResult.fail("네이버 응답 구조 오류");
            String id = stringOrEmpty(responseMapRaw.get("id"));
            String em = stringOrEmpty(responseMapRaw.get("email"));
            return NaverVerifyResult.ok(new NaverProfile(id, em));
        } catch (Exception e) { return NaverVerifyResult.fail("네이버 인증 처리 중 예외: " + e.getMessage()); }
    }

    private KakaoVerifyResult verifyKakaoAuthorizationCode(String code, String state, String redirectUri) {
        if (code == null || code.isBlank()) return KakaoVerifyResult.fail("카카오 code 값이 없습니다.");
        try {
            StringBuilder body = new StringBuilder()
                    .append("grant_type=authorization_code")
                    .append("&client_id=").append(URLEncoder.encode(kakaoRestApiKey, StandardCharsets.UTF_8))
                    .append("&redirect_uri=").append(URLEncoder.encode(redirectUri, StandardCharsets.UTF_8))
                    .append("&code=").append(URLEncoder.encode(code, StandardCharsets.UTF_8))
                    .append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
            if (kakaoClientSecret != null && !kakaoClientSecret.isBlank())
                body.append("&client_secret=").append(URLEncoder.encode(kakaoClientSecret, StandardCharsets.UTF_8));

            HttpResponse<String> tokenResp = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create("https://kauth.kakao.com/oauth/token"))
                            .header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8")
                            .POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(),
                    HttpResponse.BodyHandlers.ofString());
            if (tokenResp.statusCode() != 200) return KakaoVerifyResult.fail("카카오 토큰 교환 실패");
            Map<String, Object> tokenMap = objectMapper.readValue(tokenResp.body(), new TypeReference<>() {});
            String accessToken = stringOrEmpty(tokenMap.get("access_token"));

            HttpResponse<String> profileResp = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create("https://kapi.kakao.com/v2/user/me"))
                            .header("Authorization", "Bearer " + accessToken).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            Map<String, Object> bodyMap = objectMapper.readValue(profileResp.body(), new TypeReference<>() {});
            String id = stringOrEmpty(bodyMap.get("id"));
            String email = "";
            Object accountObj = bodyMap.get("kakao_account");
            if (accountObj instanceof Map<?, ?> accountMapRaw) email = stringOrEmpty(accountMapRaw.get("email"));
            return KakaoVerifyResult.ok(new KakaoProfile(id, email));
        } catch (Exception e) { return KakaoVerifyResult.fail("카카오 인증 처리 중 예외: " + e.getMessage()); }
    }

    public AuthResponse.UserDto getMe(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return null;
        return new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getRole());
    }

    @Transactional
    public boolean promoteToAdmin(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return false;
        user.setRole("ADMIN");
        userRepository.saveAndFlush(user);
        return true;
    }

    public String getRoleByEmail(String email) {
        return userRepository.findByEmail(email).map(User::getRole).orElse(null);
    }

    private String stringOrEmpty(Object value) { return value == null ? "" : String.valueOf(value); }
    private String normalizeEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
    private boolean isValidEmail(String email) { return email != null && !email.isBlank() && EMAIL_PATTERN.matcher(email).matches(); }
    private boolean isStrongPassword(String password) {
        if (password == null || password.length() < PASSWORD_MIN_LENGTH || password.length() > PASSWORD_MAX_LENGTH) return false;
        if (password.chars().anyMatch(Character::isWhitespace)) return false;
        return PASSWORD_LETTER_PATTERN.matcher(password).matches()
                && PASSWORD_DIGIT_PATTERN.matcher(password).matches()
                && PASSWORD_SPECIAL_PATTERN.matcher(password).matches();
    }
    private String providerLabel(String provider) {
        if (provider == null) return "소셜";
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "google" -> "Google"; case "naver" -> "Naver"; case "kakao" -> "Kakao"; default -> "소셜";
        };
    }

    private record GoogleProfile(String sub, String email, boolean emailVerified) {}
    private record NaverProfile(String id, String email) {}
    private record NaverVerifyResult(boolean success, NaverProfile profile, String error) {
        static NaverVerifyResult ok(NaverProfile p) { return new NaverVerifyResult(true, p, null); }
        static NaverVerifyResult fail(String e) { return new NaverVerifyResult(false, null, e); }
    }
    private record KakaoProfile(String id, String email) {}
    private record KakaoVerifyResult(boolean success, KakaoProfile profile, String error) {
        static KakaoVerifyResult ok(KakaoProfile p) { return new KakaoVerifyResult(true, p, null); }
        static KakaoVerifyResult fail(String e) { return new KakaoVerifyResult(false, null, e); }
    }
}
```

### 8-5. `service/AiGenerationHistoryService.java`

```java
package com.wedding.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wedding.api.dto.AiInvitationImageResponse;
import com.wedding.api.entity.AiGenerationHistory;
import com.wedding.api.repository.AiGenerationHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiGenerationHistoryService {

    private final AiGenerationHistoryRepository aiGenerationHistoryRepository;
    private final ObjectMapper objectMapper;

    public void record(String userId, String sourceImageId, String sourceImageUrl, String type,
                       String provider, AiInvitationImageResponse response) {
        AiGenerationHistory history = AiGenerationHistory.builder()
                .userId(userId)
                .sourceImageId(blankToNull(sourceImageId))
                .sourceImageUrl(blankToNull(sourceImageUrl))
                .type(type)
                .provider(normalizeProvider(provider))
                .resultSummary(blankToNull(response.getAnalysisSummary()))
                .configPatchJson(toJson(response))
                .build();
        aiGenerationHistoryRepository.save(history);
    }

    private String toJson(AiInvitationImageResponse response) {
        if (response.getConfigPatch() == null || response.getConfigPatch().isEmpty()) return null;
        try { return objectMapper.writeValueAsString(response.getConfigPatch()); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Failed to serialize AI config patch", e); }
    }

    private String normalizeProvider(String provider) {
        return (provider == null || provider.isBlank()) ? "openclaw1" : provider.trim();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
```

### 8-6~8-7. InvitationService, ObjectStorageService, AdminService, OpenAi/OpenClaw 서비스

> 이 서비스들은 코드가 매우 깁니다 (각 200~1500줄).
> **기존 프로젝트에서 직접 복사하세요:**
> - `service/InvitationService.java` (604줄) - 청첩장 CRUD + 이미지 업로드/리사이즈
> - `service/ObjectStorageService.java` (187줄) - MinIO 연동
> - `service/AdminService.java` (404줄) - 관리자 기능
> - `service/OpenAiInvitationService.java` (1499줄) - AI 청첩장 생성
> - `service/OpenClawAiService.java` (314줄) - OpenClaw AI 스킨 생성

> ✅ Service 완성! 다음은 Controller

---

## STEP 9: Controller (4개)

### 9-1. `controller/AuthController.java`

```java
package com.wedding.api.controller;

import com.wedding.api.dto.AuthRequest;
import com.wedding.api.dto.AuthResponse;
import com.wedding.api.service.AuthService;
import com.wedding.api.service.RefreshTokenService;
import com.wedding.api.service.EmailVerificationService;
import com.wedding.api.service.SignupRateLimitService;
import com.wedding.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final SignupRateLimitService signupRateLimitService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/register/send-code")
    public ResponseEntity<?> sendRegisterCode(@RequestBody AuthRequest req, HttpServletRequest request) {
        if (req == null || req.getEmail() == null || req.getEmail().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "이메일을 입력해 주세요."));
        String clientIp = resolveClientIp(request);
        if (!signupRateLimitService.allowSendCode(clientIp, req.getEmail()))
            return ResponseEntity.status(429).body(Map.of("error", "인증코드 요청이 너무 많습니다."));
        EmailVerificationService.Result result = emailVerificationService.sendCode(req.getEmail());
        if (!result.success()) return ResponseEntity.badRequest().body(Map.of("error", result.message()));
        return ResponseEntity.ok(Map.of("success", true, "message", result.message()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req, HttpServletRequest request) {
        String clientIp = resolveClientIp(request);
        if (!signupRateLimitService.allowAttempt(clientIp, req.getEmail()))
            return ResponseEntity.status(429).body(Map.of("error", "가입 요청이 너무 많습니다."));
        AuthResponse res = authService.register(req.getEmail(), req.getPassword(), req.getVerificationCode());
        if (!res.isSuccess()) return ResponseEntity.badRequest().body(Map.of("error", res.getError()));
        return ResponseEntity.ok(Map.of("success", true, "message", "회원가입이 완료되었습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        AuthResponse res = authService.login(req.getEmail(), req.getPassword());
        if (!res.isSuccess()) return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String requestRefreshToken = body.get("refreshToken");
        if (requestRefreshToken == null || requestRefreshToken.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Refresh Token이 없습니다."));
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(com.wedding.api.entity.RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
                    return ResponseEntity.ok(Map.of("accessToken", accessToken, "refreshToken", requestRefreshToken));
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    @PostMapping("/social/google")
    public ResponseEntity<?> socialGoogle(@RequestBody Map<String, String> body) {
        AuthResponse res = authService.loginWithGoogleIdToken(body != null ? body.get("idToken") : null);
        if (!res.isSuccess()) return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/social/naver")
    public ResponseEntity<?> socialNaver(@RequestBody Map<String, String> body) {
        AuthResponse res = authService.loginWithNaverCode(body.get("code"), body.get("state"), body.get("redirectUri"));
        if (!res.isSuccess()) return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/social/kakao")
    public ResponseEntity<?> socialKakao(@RequestBody Map<String, String> body) {
        AuthResponse res = authService.loginWithKakaoCode(body.get("code"), body.get("state"), body.get("redirectUri"));
        if (!res.isSuccess()) return ResponseEntity.status(401).body(Map.of("error", res.getError()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/promote-admin")
    public ResponseEntity<?> promoteAdmin(@RequestBody Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "email 필드를 입력해 주세요."));
        boolean ok = authService.promoteToAdmin(email.trim());
        if (!ok) return ResponseEntity.badRequest().body(Map.of("error", "해당 이메일 사용자를 찾을 수 없습니다."));
        return ResponseEntity.ok(Map.of("success", true, "email", email, "role", "ADMIN", "message", "권한 부여 완료. 로그아웃 후 다시 로그인해 주세요."));
    }

    @GetMapping("/check-role")
    public ResponseEntity<?> checkRole(@RequestParam String email) {
        String role = authService.getRoleByEmail(email);
        return ResponseEntity.ok(Map.of("email", email, "found", role != null, "role", role != null ? role : ""));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        String userId = authentication.getName();
        AuthResponse.UserDto user = authService.getMe(userId);
        if (user == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("user", user));
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        try {
            authService.deleteAccount(userId);
            return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
        } catch (Exception e) { return ResponseEntity.status(500).body(Map.of("error", e.getMessage())); }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) return xri.trim();
        return request.getRemoteAddr();
    }
}
```

### 9-2. `controller/InvitationController.java`

```java
package com.wedding.api.controller;

import com.wedding.api.dto.*;
import com.wedding.api.entity.Invitation;
import com.wedding.api.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final OpenAiInvitationService openAiInvitationService;
    private final AiGenerationHistoryService aiGenerationHistoryService;

    @GetMapping("/my")
    public ResponseEntity<?> myInvitations(Authentication auth) {
        return ResponseEntity.ok(Map.of("invitations", invitationService.getMyInvitations((String) auth.getPrincipal())));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        Invitation inv = invitationService.getBySlug(slug);
        if (inv == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("invitation", inv));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id, Authentication auth) {
        Invitation inv = invitationService.getById(id, (String) auth.getPrincipal());
        if (inv == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("invitation", inv));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        try { invitationService.deleteById(id, (String) auth.getPrincipal()); return ResponseEntity.ok(Map.of("success", true)); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody InvitationRequest req, Authentication auth) {
        try { return ResponseEntity.ok(Map.of("success", true, "invitation", invitationService.save(req, (String) auth.getPrincipal()))); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            InvitationService.UploadResult result = invitationService.uploadFile(file, (String) auth.getPrincipal());
            return ResponseEntity.ok(Map.of("success", true, "url", result.url(), "thumbnailUrl", result.thumbnailUrl(),
                    "analysisImageUrl", result.analysisImageUrl(), "mediaFileId", result.mediaFileId()));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "업로드 실패")); }
    }

    @PostMapping("/{id}/guestbook")
    public ResponseEntity<?> addGuestbook(@PathVariable String id, @RequestBody Map<String, String> body) {
        try { return ResponseEntity.ok(Map.of("success", true, "entry", invitationService.addGuestbook(id, body.get("writerName"), body.get("content")))); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "방명록 저장에 실패했습니다.")); }
    }

    @PostMapping("/{id}/attendance")
    public ResponseEntity<?> addAttendance(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            var att = invitationService.addAttendance(id, (String) body.get("name"), (String) body.get("side"),
                    (Boolean) body.get("attending"), body.get("count") != null ? ((Number) body.get("count")).intValue() : 1,
                    (Boolean) body.get("meal"), body.get("mealCount") != null ? ((Number) body.get("mealCount")).intValue() : null,
                    (String) body.get("message"));
            return ResponseEntity.ok(Map.of("success", true, "attendance", att));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "참석 여부 전달에 실패했습니다.")); }
    }
}
```

### 9-3. `controller/SkinController.java`

```java
package com.wedding.api.controller;

import com.wedding.api.entity.Skin;
import com.wedding.api.repository.SkinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skins")
@RequiredArgsConstructor
public class SkinController {

    private final SkinRepository skinRepository;

    @GetMapping
    public ResponseEntity<?> list() {
        List<Skin> skins = skinRepository.findByIsActiveTrueOrderByCreatedAtDesc();
        return ResponseEntity.ok(Map.of("skins", skins));
    }
}
```

### 9-4. `controller/AdminController.java`

> AdminService에 의존하므로 AdminService를 먼저 만든 후 작성.
> 기존 프로젝트에서 복사하세요 (110줄)

> ✅ Controller 4개 완성! 다음은 Config

---

## STEP 10: Config (5개)

### 10-1. `config/SecurityConfig.java`

```java
package com.wedding.api.config;

import com.wedding.api.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.Customizer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/register/send-code",
                    "/api/auth/social/google", "/api/auth/social/naver", "/api/auth/social/kakao",
                    "/api/auth/promote-admin", "/api/auth/check-role").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/invitations/slug/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/skins").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/invitations/*/guestbook").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/invitations/*/attendance").permitAll()
                .requestMatchers("/uploads/**", "/api/uploads/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"error\":\"인증이 필요합니다.\"}");
                })
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"error\":\"접근이 거부되었습니다.\"}");
                }))
            .headers(h -> h.frameOptions(f -> f.sameOrigin()))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/uploads/**", "/api/uploads/**");
    }
}
```

### 10-2. `config/WebConfig.java`

```java
package com.wedding.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.*;

import java.nio.file.*;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${upload.dir}")
    private String uploadDir;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("http://localhost:3000", "http://127.0.0.1:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*").allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        registry.addResourceHandler("/uploads/**", "/api/uploads/**")
                .addResourceLocations("file:" + uploadPath + "/")
                .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic().immutable());
    }
}
```

### 10-3. `config/StorageProperties.java`

```java
package com.wedding.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter @Setter
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {
    private MinioProperties minio = new MinioProperties();

    @Getter @Setter
    public static class MinioProperties {
        private MinioTarget fast = new MinioTarget();
        private MinioTarget cold = new MinioTarget();
    }

    @Getter @Setter
    public static class MinioTarget {
        private String endpoint;
        private String publicBaseUrl;
        private String accessKey;
        private String secretKey;
        private String bucket;
    }
}
```

### 10-4. `config/MinioConfig.java`

```java
package com.wedding.api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class MinioConfig {
}
```

### 10-5. `config/SkinInitializer.java`

```java
package com.wedding.api.config;

import com.wedding.api.entity.Skin;
import com.wedding.api.repository.SkinRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class SkinInitializer {

    private final SkinRepository skinRepository;

    @PostConstruct
    public void initDefaultSkins() {
        createIfMissing("modern", "모던 기본 스킨");
        createIfMissing("elegant", "엘레강트 기본 스킨");
        createIfMissing("classic", "클래식 기본 스킨");
    }

    private void createIfMissing(String slug, String description) {
        Optional<Skin> existing = skinRepository.findBySlug(slug);
        if (existing.isPresent()) return;
        String displayName = switch (slug) {
            case "modern" -> "모던";
            case "elegant" -> "엘레강트";
            case "classic" -> "클래식";
            default -> slug;
        };
        skinRepository.save(Skin.builder().name(displayName).slug(slug).description(description).build());
        log.info("Initialized default skin: {}", slug);
    }
}
```

> ✅ 백엔드 전체 완성! `./gradlew bootRun`으로 서버 기동 가능

---

## 전체 파일 작성 순서 체크리스트 (백엔드 44개)

```
✅ Phase 1: 빌드 (2개)
  □ settings.gradle
  □ build.gradle

✅ Phase 2: 리소스 (3개)
  □ application.yml
  □ application-dev.yml
  □ application-prod.yml

✅ Phase 3: 메인 (1개)
  □ WeddingApplication.java

✅ Phase 4: Entity (10개)
  □ entity/User.java
  □ entity/Invitation.java
  □ entity/Skin.java
  □ entity/RefreshToken.java
  □ entity/Guestbook.java
  □ entity/Attendance.java
  □ entity/BankAccount.java
  □ entity/MediaFile.java
  □ entity/AiGenerationHistory.java
  □ entity/AiPromptBlockLog.java

✅ Phase 5: Repository (10개)
  □ repository/UserRepository.java
  □ repository/InvitationRepository.java
  □ repository/SkinRepository.java
  □ repository/RefreshTokenRepository.java
  □ repository/GuestbookRepository.java
  □ repository/AttendanceRepository.java
  □ repository/BankAccountRepository.java
  □ repository/MediaFileRepository.java
  □ repository/AiGenerationHistoryRepository.java
  □ repository/AiPromptBlockLogRepository.java

✅ Phase 6: Security (2개)
  □ security/JwtTokenProvider.java
  □ security/JwtAuthenticationFilter.java

✅ Phase 7: DTO (9개)
  □ dto/AuthRequest.java
  □ dto/AuthResponse.java
  □ dto/InvitationRequest.java
  □ dto/SkinRequest.java
  □ dto/SkinAiGenerateRequest.java
  □ dto/AdminUserDto.java
  □ dto/AiInvitationImageRequest.java
  □ dto/AiInvitationImageResponse.java
  □ dto/AiInvitationPromptRequest.java

✅ Phase 8: Service (7개 + 추가 3개)
  □ service/EmailVerificationService.java
  □ service/SignupRateLimitService.java
  □ service/RefreshTokenService.java
  □ service/AuthService.java
  □ service/InvitationService.java ← 기존 프로젝트에서 복사
  □ service/ObjectStorageService.java ← 기존 프로젝트에서 복사
  □ service/AiGenerationHistoryService.java
  □ service/AdminService.java ← 기존 프로젝트에서 복사
  □ service/OpenAiInvitationService.java ← 기존 프로젝트에서 복사
  □ service/OpenClawAiService.java ← 기존 프로젝트에서 복사

✅ Phase 9: Controller (4개)
  □ controller/AuthController.java
  □ controller/InvitationController.java
  □ controller/SkinController.java
  □ controller/AdminController.java ← 기존 프로젝트에서 복사

✅ Phase 10: Config (5개)
  □ config/SecurityConfig.java
  □ config/WebConfig.java
  □ config/StorageProperties.java
  □ config/MinioConfig.java
  □ config/SkinInitializer.java
```

---

## 의존성 체인 요약

```
Entity (의존성 없음)
  ↓
Repository (Entity에만 의존)
  ↓
Security (외부 라이브러리에만 의존 - JWT)
  ↓
DTO (의존성 없음 - Lombok만)
  ↓
Service (Repository + Security + DTO에 의존)
  ↓
Controller (Service + DTO에 의존)
  ↓
Config (Security + Repository에 의존)
```

**이 순서를 지키면 컴파일 에러 없이 하나씩 추가할 수 있습니다!**
