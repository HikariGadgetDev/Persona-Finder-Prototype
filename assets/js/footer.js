document.addEventListener("DOMContentLoaded", () => {
  const footerHTML = `
  <!-- フッター -->
  <footer class="landing-footer">
    <div class="landing-container">
      <p class="footer-quote">"真理への道は、正しい理論を盲信することではなく、<wbr>誤った理論を誠実に検証し、<wbr>より良いものへと進むことにある。"</p>
      <p class="footer-text">※ 本診断ツールはMBTI理論およびユング心理学を参考に独自開発したものであり</p>
      <p class="footer-text">Mentuzzle・16Personalities・The Myers-Briggs Company等の公式サービスとは一切関係ありません。</p>
      <p class="footer-text">© 2025 Persona Finder made with transparency</p>
    </div>
  </footer>
  `;
  document.body.insertAdjacentHTML("beforeend", footerHTML);
});
