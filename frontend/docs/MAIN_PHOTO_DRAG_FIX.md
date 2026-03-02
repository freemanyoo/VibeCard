# 메인 포토 드래그(위치 조절) 수정 가이드

## 현재 증상
1. **깜빡임**: 미리보기에서 메인 포토를 드래그할 때 화면이 깜빡인다.
2. **위치 되돌아감**: 드래그하다가 손을 떼기 전에, 또는 떼는 순간 이미지가 다시 원래 위치로 돌아간다.

---

## 원인 요약

### 1. 위치가 원래대로 돌아가는 이유
- 드래그 중에는 **React state(`photoPosition`)를 바꾸지 않고**, `previewImageRef.current.style.objectPosition`으로만 DOM을 직접 갱신하고 있음.
- 그런데 **React가 한 번이라도 리렌더하면**, `InvitationView`에 `data.mainPhotoPosition={photoPosition}`(아직 갱신 안 된 예전 값)이 넘어감.
- 그러면 `<img style={{ objectPosition: data.mainPhotoPosition }} />` 때문에 **예전 위치로 덮어씌워짐** → “다시 원래대로 이동”하는 것처럼 보임.
- `setIsDragging(true)` 한 번만 호출해도 리렌더가 나고, 그때 이미 `photoPosition`은 예전 값이므로 바로 덮어씌워질 수 있음.

### 2. 깜빡임이 나는 이유
- 위와 같은 리렌더가 드래그 중에 여러 번 일어나면, DOM 직접 수정 ↔ React가 예전 값으로 덮어쓰기가 반복되면서 **깜빡이는 것처럼** 보임.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/pages/Builder.jsx` | `photoPosition` state, `previewImageRef`, `handleMouseDown` / `handleMouseMove` / `onUp`, document `mousemove`/`mouseup` 리스너, `setPhotoPosition`은 **mouseup 시에만** 호출 |
| `src/components/InvitationView.jsx` | 미리보기용 메인 포토 `<img>` 두 곳(풀 이미지 / 일반). `ref={previewImageRef}`, `style={{ objectPosition: data.mainPhotoPosition }}` |

---

## 수정 방향 제안

**핵심**: 드래그 중에는 React가 `objectPosition`을 **한 번도 덮어쓰지 않게** 해야 함.

### 방법 A: CSS 변수 + ref로만 갱신 (권장)
- 메인 포토를 감싼 **컨테이너 div**에 ref를 단다. (예: `previewPhotoContainerRef`)
- 해당 컨테이너에만 **드래그 중** `style.setProperty('--photo-x', nx+'%')`, `setProperty('--photo-y', ny+'%')` 로 CSS 변수 갱신.
- `<img>`는 `style={{ objectPosition: 'var(--photo-x) var(--photo-y)' }}` 사용.
- **중요**: `isDragging === true`일 때는 이 컨테이너에 `--photo-x`, `--photo-y`를 **React props/state로 넘기지 않기**. (ref로만 갱신)  
  → React 리렌더가 나도 변수값이 덮어씌워지지 않음.
- `isDragging === false`일 때만 `data.mainPhotoPosition`을 파싱해서 `--photo-x`, `--photo-y`를 props로 넣어주면, 저장/불러오기 후에도 위치가 맞음.

### 방법 B: 드래그 중에는 img에 objectPosition을 안 넘기기
- `isDragging`이 true일 때는 `<img>`에 `objectPosition`을 **넘기지 않음** (undefined 또는 기존 ref로 세팅한 값 유지).
- 이 경우 ref로 세팅한 `img.style.objectPosition`이 React에 의해 초기화되지 않도록 해야 함.  
  (React가 `style={{}}` 만 넘기면 다른 style이 리셋될 수 있으므로, **방법 A가 더 안전**함.)

---

## 현재 동작 정리 (다른 AI가 참고할 코드 흐름)

1. **MouseDown**  
   `startDrag(clientX, clientY)` → `setIsDragging(true)`, `dragStart.current = { x, y, pos: photoPosition }`
2. **MouseMove (document + div 둘 다)**  
   `pendingPosRef.current = next`, `previewImageRef.current.style.objectPosition = next`  
   (또는 `handleMouseMove`에서는 rAF로 `applyPendingPosition` 호출)
3. **MouseUp (document)**  
   `setPhotoPosition(pendingPosRef.current ?? dragStart.current.pos)`, `previewImageRef.current.style.objectPosition = finalPos`, `setIsDragging(false)`

문제는 1번에서 `setIsDragging(true)` 후 리렌더 시, 2번에서 갱신한 DOM이 3번 전에 다시 `data.mainPhotoPosition`(예전 state)으로 덮어씌워질 수 있다는 점.

---

## 체크리스트 (수정 후 확인)
- [ ] 미리보기에서 메인 포토를 드래그하는 동안 **깜빡임이 없음**
- [ ] 드래그 후 손을 떼면 **그 위치가 유지**되고, 다시 원래대로 돌아가지 않음
- [ ] 저장 후 청첩장 페이지(`/invitation/:slug`)에서도 **동일한 위치**로 보임
- [ ] 좌측 편집기 메인 포토 썸네일은 **저장/불러오기 또는 mouseup 후**에만 위치가 반영되어도 됨 (드래그 중 실시간 반영은 필수 아님)
