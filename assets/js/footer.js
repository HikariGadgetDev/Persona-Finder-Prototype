// ==========================================
// footer.js - Persona Finder 完全版（安全メールリンク対応）
// ==========================================

(function() {
  'use strict';

  // ==========================================
  // 設定（Base64でbot対策）
  // ==========================================
  const CONFIG = {
    currentYear: new Date().getFullYear(),
    githubEncoded: 'aHR0cHM6Ly9naXRodWIuY29tL0hpa2FyaUdhZGdldERldi9QZXJzb25hLUZpbmRlci1Qcm90b3R5cGU=',
    mailEncoded: 'aGt1cm9rYXdhZGV2QGdtYWlsLmNvbQ==',
    enableAnimation: true,
    enableSmoothScroll: true
  };

  // Base64デコード関数
  function decodeBase64(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      return atob(str);
    }
  }

  // 復号化された値
  const githubUrl = decodeBase64(CONFIG.githubEncoded);
  const contactEmail = decodeBase64(CONFIG.mailEncoded);

  // ==========================================
  // フッターHTMLテンプレート
  // ==========================================
  const footerTemplate = `
    <footer class="site-footer" role="contentinfo">
      <div class="footer-container">
        
        <div class="footer-top">
          <div class="footer-brand">
            <a href="index.html" class="footer-logo" aria-label="Persona Finderホームに戻る">
              <div class="footer-logo-icon">Ψ</div>
              <span class="footer-logo-text">Persona Finder</span>
            </a>
            <p class="footer-tagline">透明な理論の中で、あなた自身を見出す</p>
          </div>

          <nav class="footer-nav" aria-label="フッターナビゲーション">
            <div class="footer-nav-column">
              <h4 class="footer-nav-title">診断ツール</h4>
              <ul>
                <li><a href="finder.html">認知機能診断</a></li>
                <li><a href="index.html#types-section">16タイプ一覧</a></li>
                <li><a href="index.html#cognitive-section">8つの機能</a></li>
              </ul>
            </div>

            <div class="footer-nav-column">
              <h4 class="footer-nav-title">理論について</h4>
              <ul>
                <li><a href="index.html#transparency-section">透明性の宣言</a></li>
                <li><a href="index.html#faq-section">よくある質問</a></li>
                <li><a href="index.html#controversial-section">理論の限界</a></li>
              </ul>
            </div>

            <div class="footer-nav-column">
              <h4 class="footer-nav-title">リソース</h4>
              <ul>
                <li><a id="footer-github" target="_blank" rel="noopener noreferrer" aria-label="GitHubリポジトリを開く（新しいタブ）">GitHub<span class="external-icon" aria-hidden="true">↗</span></a></li>
                <li><a id="footer-contact" href="#" aria-label="お問い合わせメールを送る">お問い合わせ</a></li>
                <li><a href="privacy.html" aria-label="プライバシーポリシーを読む">プライバシー</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <div class="footer-divider" aria-hidden="true"></div>

        <div class="footer-bottom">
          <div class="footer-quote">
            <blockquote class="quote-text">
              <p>"真理への道は、正しい理論を盲信することではなく、誤った理論を誠実に検証し、より良いものへと進むことにある。"</p>
            </blockquote>
          </div>

          <div class="footer-meta">
            <p class="footer-disclaimer">
              本診断ツールはMBTI理論およびユング心理学を参考に独自開発したものであり、<br class="hide-mobile">
              Mentuzzle・16Personalities・The Myers-Briggs Company等の公式サービスとは一切関係ありません。
            </p>
            <p class="footer-copyright">
              © <time datetime="${CONFIG.currentYear}">${CONFIG.currentYear}</time> Persona Finder ·
              Licensed for academic and educational use (CC BY-NC-SA 4.0).<br>
              For commercial licensing or redistribution inquiries, please <a id="footer-mail-link" href="#">click here</a>.
            </p>
          </div>
        </div>

        <div class="footer-glow" aria-hidden="true"></div>
      </div>
    </footer>
  `;

  // ==========================================
  // 挿入処理
  // ==========================================
  function injectFooter() {
    const existingFooter = document.querySelector('.site-footer:not(.site-footer-noscript)');
    if (existingFooter) existingFooter.remove();

    document.body.insertAdjacentHTML('beforeend', footerTemplate);
    initializeFooter();
  }

  // ==========================================
  // 初期化処理
  // ==========================================
  function initializeFooter() {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;

    // GitHubリンク動的設定
    const githubLink = footer.querySelector('#footer-github');
    if (githubLink) githubLink.href = githubUrl;

    // mailtoリンク制御（footer消失防止）
    const contactLink = footer.querySelector('#footer-contact');
    const mailLink = footer.querySelector('#footer-mail-link');
    const mailtoUrl = `mailto:${contactEmail}`;

    [contactLink, mailLink].forEach(link => {
      if (link) {
        link.addEventListener('click', e => {
          e.preventDefault();
          window.location.href = mailtoUrl;
        });
      }
    });

    if (CONFIG.enableSmoothScroll) setupSmoothScroll(footer);
    if (CONFIG.enableAnimation) setupAnimations(footer);
    setupExternalLinks(footer);
  }

  // ==========================================
  // スムーススクロール
  // ==========================================
  function setupSmoothScroll(footer) {
    footer.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, null, href);
        }
      });
    });
  }

  // ==========================================
  // 外部リンク安全設定
  // ==========================================
  function setupExternalLinks(footer) {
    footer.querySelectorAll('a[target="_blank"]').forEach(link => {
      let rel = link.getAttribute('rel') || '';
      if (!rel.includes('noopener')) rel += ' noopener';
      if (!rel.includes('noreferrer')) rel += ' noreferrer';
      link.setAttribute('rel', rel.trim());
    });
  }

  // ==========================================
  // アニメーション
  // ==========================================
  function setupAnimations(footer) {
    requestAnimationFrame(() => footer.classList.add('footer-visible'));
  }

  // ==========================================
  // 実行
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }

})();
