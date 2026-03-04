# AI 생성 스킨 프리뷰 레이아웃 불일치 이슈 정리

## 현재 증상
1. **모바일 프리뷰 폭 축소**: 새 스킨 디자인에서 `inv-hero` 내부 콘텐츠가 폰 레이아웃 폭에 꽉 차지 않고, 실제 초대장보다 작게 보인다.
2. **웹 프리뷰 스타일 불일치**: AI 생성 후 웹 프리뷰가 일반 `청첩장 만들기` 화면과 같은 레이아웃 비율로 보이지 않고, 일부 영역이 다른 스타일처럼 보인다.
3. **AI 생성 후에만 재현**: 기본 스킨 또는 기존 저장 스킨보다, AI가 생성한 스킨 설정을 미리보기로 반영했을 때 문제가 더 도드라진다.

---

## 원인 요약

### 1. 문제는 `inv-hero` 클래스 자체보다 프리뷰 전용 레이아웃 분기
- `inv-hero`는 현재 `w-full max-w-full`이 이미 들어가 있다.
- 즉, 겉 컨테이너 폭 자체가 없는 문제가 아니라, **프리뷰 모드에서 내부 콘텐츠 폭 계산이 별도 분기**를 타는 것이 핵심이다.
- AI 생성 후에는 spacing, text size, photo mode 같은 값이 바뀌면서 이 프리뷰 전용 계산 차이가 더 눈에 띄게 드러난다.

### 2. 모바일 프리뷰와 웹 프리뷰가 같은 렌더 경로를 안 탄다
- `InvitationView`는 `isPreview`일 때 별도의 preview sizing 로직을 사용한다.
- 그런데 **웹 프리뷰는 `previewUseLivePhotoLayout`를 넘겨서 실제 레이아웃과 가깝게 렌더링**하고,
- **모바일 프리뷰는 같은 옵션을 안 넘기는 경로가 있다.**
- 그 결과, 같은 스킨 데이터여도 모바일/웹 미리보기의 hero 폭, photo 폭, spacing 계산이 달라질 수 있다.

### 3. `absolute inset-0 overflow-y-auto hide-scrollbar`는 원인보다 감싸는 프레임 역할
- 이 래퍼는 프레임 전체 높이/스크롤 영역을 잡는 역할이다.
- 실제 폭이 줄어드는 지점은 래퍼가 아니라, 그 안에서 렌더되는 `InvitationView`의 **preview 전용 내부 폭 계산**이다.
- 그래서 바깥 래퍼가 `absolute inset-0`이어도, 내부 hero 콘텐츠는 작아 보일 수 있다.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/InvitationView.jsx` | `inv-hero`, `inv-hero-info`, preview 전용 photo/spacing/width 계산의 핵심 |
| `frontend/src/pages/Builder.jsx` | 모바일 프리뷰와 웹 프리뷰에서 `InvitationView`를 어떻게 호출하는지 결정 |
| `frontend/src/pages/AdminSkins.jsx` | 관리자 AI 스킨 생성/미리보기 경로. 모바일/웹 프리뷰 불일치가 같이 드러나는 지점 |

---

## 현재 코드 기준 관찰 포인트

### 1. `InvitationView.jsx`
- `inv-hero`는 이미 `w-full max-w-full`이다.
- 따라서 **바깥 hero 박스가 좁아지는 것처럼 보여도, 실제론 내부 자식 폭/spacing 계산이 줄어드는 문제**로 보는 게 맞다.
- 특히 preview 관련 분기:
  - `isPreview`
  - `compactPreview`
  - `previewUseLivePhotoLayout`
  - `previewStandardBaseWidth`
  - `shouldUseOuterEdgeStandardPhotoWidth`
  이런 값들이 hero 하위 콘텐츠의 체감을 바꾼다.

### 2. `Builder.jsx`
- 모바일 프리뷰는 `absolute inset-0 overflow-y-auto hide-scrollbar` 안에서 `InvitationView`를 렌더한다.
- 웹 프리뷰는 별도 래퍼에서 `InvitationView`를 렌더하고, **`previewUseLivePhotoLayout`를 넘기는 경로가 있다.**
- 이 차이 때문에 같은 스킨이라도 모바일과 웹 프리뷰가 다르게 보일 수 있다.

### 3. `AdminSkins.jsx`
- 관리자 AI 스킨 미리보기 역시 모바일 프레임 안에서 별도 preview 경로를 탄다.
- 따라서 `Builder`와 `AdminSkins` 둘 다 **같은 preview 기준을 쓰도록 맞추지 않으면**, AI 생성 후 “웹만 이상함”, “모바일만 작음” 같은 현상이 반복된다.

---

## 수정 방향 제안

### 방법 A: 모바일 프리뷰도 `previewUseLivePhotoLayout` 기준 통일
- `Builder.jsx` 모바일 프리뷰
- `AdminSkins.jsx` 모바일 프리뷰
- 이 두 군데에서도 웹 프리뷰처럼 `previewUseLivePhotoLayout`를 전달해, **실제 초대장과 같은 레이아웃 계산**을 우선 적용한다.
- 이게 가장 우선순위가 높다.

### 방법 B: `InvitationView`의 preview 분기 최소화
- `isPreview`일 때 별도 폭 계산을 하더라도,
- hero 섹션과 hero info 영역은 실제 렌더와 같은 폭 기준을 더 강하게 따르도록 정리한다.
- 즉, AI 스킨이 spacing 값을 바꿔도 hero 내부 콘텐츠 폭이 줄어들지 않게 해야 한다.

### 방법 C: AI 생성 스킨 반영 시 프리뷰와 실적용 레이아웃 차이를 따로 검증
- AI 스킨 생성은 색상/텍스트/spacing 값을 바꾸므로, **기존 수동 편집보다 레이아웃 극단값을 더 잘 만든다.**
- 따라서 AI 생성 직후에는
  - 모바일 프리뷰
  - 웹 프리뷰
  - 실제 초대장 렌더
  이 셋이 같은 기준으로 보이는지 별도 체크가 필요하다.

---

## 체크리스트 (수정 후 확인)
- [ ] AI 생성 직후 모바일 프리뷰에서 `inv-hero` 내부 콘텐츠가 폰 프레임 폭에 맞게 보인다
- [ ] AI 생성 직후 웹 프리뷰가 일반 `청첩장 만들기`와 같은 레이아웃 비율로 보인다
- [ ] 같은 스킨 데이터를 모바일/웹에서 봐도 hero 폭 체감이 크게 다르지 않다
- [ ] `absolute inset-0 overflow-y-auto hide-scrollbar` 래퍼 안쪽에서 가로폭이 불필요하게 줄어들지 않는다
- [ ] AI 생성 전후로 비교해도 레이아웃이 갑자기 “작아지거나 찌그러진” 느낌이 없다

---

## 결론
- 이 문제는 AI가 CSS를 직접 바꿔서 생긴다기보다, **AI 생성 스킨 값이 들어왔을 때 기존 preview 전용 레이아웃 분기의 차이가 노출되는 문제**에 가깝다.
- 따라서 핵심은 `InvitationView`의 preview 계산과 `Builder` / `AdminSkins`의 호출 옵션을 **실제 초대장과 같은 기준으로 통일**하는 것이다.
