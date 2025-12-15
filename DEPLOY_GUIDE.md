# TravelLog Album 배포 가이드

이 문서는 웹 애플리케이션을 인터넷에 배포하여 다른 사람들도 접속할 수 있게 하는 방법을 설명합니다.
현재 프로젝트는 **Firebase Hosting**을 사용하도록 설정되었습니다.

## 1. 전제 조건

터미널(명령 프롬프트)에서 다음 명령어를 실행하여 Firebase 도구를 설치해야 합니다.

```bash
npm install -g firebase-tools
```

## 2. 로그인

Firebase에 계정 권한을 연동하기 위해 로그인이 필요합니다.

```bash
firebase login
```
* 위 명령어를 입력하면 브라우저가 열립니다. Google 계정으로 로그인하고 권한을 허용해주세요.
* 이미 로그인되어 있다면 이 단계는 패스해도 됩니다.

## 3. 프로젝트 빌드

최신 코드를 배포용 파일로 변환합니다. (이미 설정이 되어 있어 자동으로 `dist` 폴더가 생성됩니다.)

```bash
npm run build
```

## 4. 배포하기

이제 실제 인터넷 상에 올립니다.

```bash
firebase deploy
```

명령어가 완료되면 `Hosting URL: https://...` 형식으로 주소가 나옵니다.
해당 주소를 클릭하면 배포된 웹사이트를 볼 수 있습니다.

---

### 문제 해결

**Q. "firebase : 이 시스템에서 스크립트를 실행할 수 없으므로..." 오류가 나요.**
A. PowerShell 권한 문제입니다. 
   1. PowerShell을 관리자 권한으로 실행하거나,
   2. 명령 프롬프트(CMD)를 대신 사용하세요.
   3. 또는 `npx firebase-tools login`, `npx firebase-tools deploy` 처럼 `npx`를 앞에 붙여서 실행해보세요.

**Q. 배포했는데 빈 화면만 나와요.**
A. 개발자 도구(F12) Console 탭에 에러가 있는지 확인해주세요. `firebase.json` 설정이 올바른지 다시 확인이 필요할 수 있습니다.
