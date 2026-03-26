import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '하하하GO',
  description: '턴제 전략 카드 게임 개발 문서',
  lang: 'ko-KR',

  themeConfig: {
    nav: [
      { text: '홈', link: '/' },
      { text: '가이드', link: '/guide/' },
      { text: '시스템', link: '/systems/' },
      { text: 'API', link: '/api/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '시작하기',
          items: [
            { text: '소개', link: '/guide/' },
            { text: '설치', link: '/guide/installation' },
            { text: '프로젝트 구조', link: '/guide/structure' },
          ]
        },
        {
          text: '개발',
          items: [
            { text: '코드 스타일', link: '/guide/code-style' },
            { text: '테스트', link: '/guide/testing' },
            { text: '기여하기', link: '/guide/contributing' },
          ]
        }
      ],
      '/systems/': [
        {
          text: '게임 시스템',
          items: [
            { text: '전투', link: '/systems/battle' },
            { text: '던전', link: '/systems/dungeon' },
            { text: '성장', link: '/systems/growth' },
            { text: '상점', link: '/systems/shop' },
          ]
        },
        {
          text: '핵심 개념',
          items: [
            { text: '에테르', link: '/systems/ether' },
            { text: '상징 (Relics)', link: '/systems/relics' },
            { text: '토큰', link: '/systems/tokens' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 레퍼런스',
          items: [
            { text: '상태 관리', link: '/api/state' },
            { text: '유틸리티', link: '/api/utils' },
            { text: '타입 정의', link: '/api/types' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/haedavja/hahahahgo' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © 2024 하하하GO'
    }
  }
})
