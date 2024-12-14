ExoProxy/
├── build/
│   └── icon.ico                 # 애플리케이션 아이콘
├── certs/
│   ├── cert.pem                  # HTTPS 인증서
│   └── key.pem                   # HTTPS 키
├── public/
│   ├── splash.html               # 스플래시 화면 HTML
│   ├── index.html                # 메인 화면 HTML
│   ├── css/
│   │   ├── main.css
│   │   ├── topbar.css
│   │   ├── launcher.css
│   │   ├── snapshots.css
│   │   ├── modals.css
│   │   └── ... (기타 CSS 파일)
│   ├── js/
│   │   ├── app.js                 # 렌더러 프로세스의 메인 JS 파일
│   │   ├── topbar.js
│   │   ├── launcher.js
│   │   ├── snapshots.js
│   │   ├── modals.js
│   │   └── ... (기타 JS 파일)
│   └── icons/                    # 아이콘들
├── src/
│   ├── electron/
│   │   ├── main.js               # Electron 메인 프로세스
│   │   └── preload.js            # Electron 프리로드 스크립트
│   └── proxy/
│       ├── encryption.js         # 데이터 암호화/복호화 모듈
│       ├── anonymity.js          # 익명성 보장 모듈
│       ├── file_encryption.js    # 파일 암호화 모듈
│       ├── ip_hide.js            # IP 숨김 모듈
│       ├── logger.js             # 로깅 모듈
│       ├── masterKey.js          # 마스터 키 관리 모듈
│       ├── routes.json           # 프론트엔드 URL 저장 파일
│       └── index.js              # Express 프록시 서버
├── scripts/
│   └── setupPAC.js               # PAC 파일 자동 설정 스크립트
├── .env                           # 환경 변수 파일
├── package.json                   # 프로젝트 메타데이터 및 의존성
└── README.md                      # 프로젝트 설명 파일

cd C:\ExoProxy

cd src\proxy

테스트 실행
npm test

빌드 및 릴리스 배포:
npm run build


다양한 명령어 (status, api list, stat, help, poweroff)