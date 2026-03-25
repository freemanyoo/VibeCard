# VibeCard Mobile 구조 정리

이 문서는 Flutter 연습용 앱인 `mobile/` 폴더의 파일 구조와 각 Dart 파일의 역할을 빠르게 파악하기 위한 문서입니다.

## 1. 전체 구조

```text
mobile/
  .gitignore
  README.md
  analysis_options.yaml
  pubspec.yaml
  assets/
    animations/
    fonts/
    icons/
    images/
  lib/
    main.dart
    src/
      app.dart
      core/
        config/
          app_env.dart
        network/
          api_client.dart
        router/
          app_router.dart
        theme/
          app_theme.dart
      features/
        ai/
          presentation/
            ai_generate_page.dart
        auth/
          presentation/
            login_page.dart
            signup_page.dart
        dashboard/
          presentation/
            dashboard_page.dart
        invitation/
          presentation/
            invitation_list_page.dart
        invitation_editor/
          presentation/
            invitation_editor_page.dart
        settings/
          presentation/
            settings_page.dart
      shared/
        widgets/
          app_scaffold.dart
  test/
    widget_test.dart
```

## 2. 구조를 이렇게 나눈 이유

- `frontend/` React 앱과 충돌하지 않게 Flutter를 `mobile/`로 완전히 분리했습니다.
- 지금 단계는 연습용이므로, 너무 무거운 클린 아키텍처보다 `feature-first` 구조로 시작했습니다.
- 공통 설정은 `core/`
- 화면 단위 기능은 `features/`
- 여러 화면에서 같이 쓰는 UI는 `shared/`
로 분리했습니다.

## 3. 루트 파일 역할

### `mobile/pubspec.yaml`
- Flutter 프로젝트의 패키지 설정 파일입니다.
- 앱 이름, 버전, SDK 범위, 의존성, 에셋 등록을 담당합니다.

### `mobile/analysis_options.yaml`
- Dart/Flutter 린트 규칙 파일입니다.
- 코드 스타일과 정적 분석 기준을 통일할 때 사용합니다.

### `mobile/.gitignore`
- Flutter 빌드 산출물과 로컬 환경 파일을 Git 추적에서 제외합니다.

### `mobile/README.md`
- Flutter 앱의 범위와 목적을 짧게 설명하는 문서입니다.

## 4. assets 역할

### `mobile/assets/images/`
- 화면에서 사용하는 일반 이미지 리소스를 둡니다.
- 예: 기본 배너, 샘플 썸네일, 온보딩 이미지

### `mobile/assets/icons/`
- 커스텀 아이콘 파일을 둡니다.
- 예: 브랜드 아이콘, 탭바 아이콘 세트

### `mobile/assets/fonts/`
- 프로젝트 전용 폰트 파일을 둡니다.
- 예: 프리텐다드, 나눔 계열, 브랜딩 폰트

### `mobile/assets/animations/`
- Lottie 같은 애니메이션 파일을 둘 수 있는 폴더입니다.

## 5. Dart 파일별 역할

### `mobile/lib/main.dart`
- Flutter 앱의 시작점입니다.
- `runApp()`으로 실제 앱 위젯을 실행합니다.
- 역할은 최소화하고, 실제 앱 구성은 `src/app.dart`로 넘기는 게 좋습니다.

### `mobile/lib/src/app.dart`
- 앱의 최상위 위젯입니다.
- `MaterialApp`, 전역 테마, 시작 화면, 라우터 연결 같은 앱 전체 설정을 담당합니다.

## 6. core 레이어

`core/`는 앱 전체에서 공통으로 쓰는 기반 설정을 모아두는 곳입니다.

### `mobile/lib/src/core/config/app_env.dart`
- 앱 이름, API Base URL 같은 전역 환경값을 관리합니다.
- 추후 dev/staging/prod 분리 시 확장 포인트가 됩니다.

### `mobile/lib/src/core/network/api_client.dart`
- HTTP 통신 레이어의 시작점입니다.
- 나중에 `http` 또는 `dio`를 붙여 공통 API 클라이언트로 확장합니다.
- 토큰 헤더, 공통 에러 처리, 인터셉터를 여기에 넣게 됩니다.

### `mobile/lib/src/core/router/app_router.dart`
- 라우트 경로 상수를 모아두는 파일입니다.
- 화면 이동 문자열을 하드코딩하지 않게 해줍니다.
- 추후 `go_router`를 붙일 때도 기준점이 됩니다.

### `mobile/lib/src/core/theme/app_theme.dart`
- 앱 전체 테마를 정의합니다.
- 색상, `ThemeData`, 폰트, AppBar 스타일 같은 공통 디자인 규칙을 담당합니다.

## 7. feature 레이어

`features/`는 실제 사용자 기능 단위로 나눈 영역입니다.

### `mobile/lib/src/features/auth/presentation/login_page.dart`
- 로그인 화면 역할입니다.
- 이메일 로그인, 소셜 로그인 버튼, 인증 에러 안내 등을 붙일 위치입니다.

### `mobile/lib/src/features/auth/presentation/signup_page.dart`
- 회원가입 화면 역할입니다.
- 이메일 회원가입, 인증 코드 입력, 비밀번호 검증 같은 흐름을 붙일 수 있습니다.

### `mobile/lib/src/features/dashboard/presentation/dashboard_page.dart`
- 로그인 후 진입하는 메인 대시보드 화면입니다.
- 내 청첩장 목록, 새 청첩장 만들기, 최근 작업 영역이 들어갈 자리입니다.

### `mobile/lib/src/features/invitation/presentation/invitation_list_page.dart`
- 청첩장 리스트 전용 화면입니다.
- 목록 조회, 카드 UI, 상태값 표시, 상세 진입 같은 흐름을 담당합니다.

### `mobile/lib/src/features/invitation_editor/presentation/invitation_editor_page.dart`
- 청첩장 편집기 화면입니다.
- 모바일 편집기라면 이 파일이 핵심 화면이 됩니다.
- 텍스트 수정, 이미지 업로드, 미리보기, 저장 액션을 붙이는 자리입니다.

### `mobile/lib/src/features/ai/presentation/ai_generate_page.dart`
- AI 디자인 생성 화면입니다.
- 이미지 기반 생성, 명령어 기반 생성, 생성 결과 적용 흐름을 붙일 수 있습니다.

### `mobile/lib/src/features/settings/presentation/settings_page.dart`
- 앱 설정 화면입니다.
- 계정 정보, 로그아웃, 앱 설정, API 환경 노출 여부 등을 다룰 수 있습니다.

## 8. shared 레이어

### `mobile/lib/src/shared/widgets/app_scaffold.dart`
- 여러 페이지에서 공통으로 쓰는 기본 스캐폴드 위젯입니다.
- AppBar, SafeArea, 공통 padding 같은 중복 UI를 줄이는 역할을 합니다.
- 페이지마다 같은 레이아웃 규칙을 유지할 때 유용합니다.

## 9. 테스트 폴더

### `mobile/test/widget_test.dart`
- Flutter 위젯 테스트 파일입니다.
- 지금은 비어 있지만, 나중에 로그인 화면 렌더링, 버튼 탭, 폼 검증 같은 테스트를 넣는 자리입니다.

## 10. 다음 확장 추천

현재 구조는 시작하기 좋은 최소 구조입니다. 실제 구현을 붙일 때는 아래 순서로 확장하면 됩니다.

1. `flutter create .` 실행
- `android/`, `ios/`, `web/` 등 Flutter 기본 플랫폼 폴더 생성

2. `auth`부터 API 연결
- `api_client.dart`에 공통 통신 로직 추가
- 토큰 저장 방식 결정

3. 각 feature에 `data / domain / presentation` 세분화
- 기능이 커질 때만 나누면 됩니다.
- 처음부터 과하게 나누면 유지가 더 어렵습니다.

예시:

```text
features/auth/
  data/
    auth_repository.dart
    auth_remote_data_source.dart
  domain/
    auth_model.dart
  presentation/
    login_page.dart
    signup_page.dart
```

## 11. 추천 원칙

- 공통은 `core/` 또는 `shared/`
- 화면 기능은 `features/`
- 페이지 파일은 너무 많은 로직을 넣지 말고, 점점 분리
- 네트워크, 모델, 상태관리는 화면에 직접 박지 않기

지금 구조는 “빠르게 시작하고, 필요할 때만 분리하는 방식”에 맞춰져 있습니다.
