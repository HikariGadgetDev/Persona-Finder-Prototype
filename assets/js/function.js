// ==========================================
// function.js - 完全版
// ==========================================

const params = new URLSearchParams(location.search);
const code = (params.get('code') || params.get('func') || 'fe').toLowerCase();

// ==========================================
// ユーティリティ関数
// ==========================================

function e(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTextToElements(str) {
  if (!str) return [];
  
  const elements = [];
  const paragraphs = str.split(/\n\n+/);
  
  paragraphs.forEach(p => {
    const para = document.createElement('p');
    const lines = p.split('\n');
    
    lines.forEach((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      parts.forEach((part, j) => {
        if (j % 2 === 1) {
          const strong = document.createElement('strong');
          strong.textContent = part;
          para.appendChild(strong);
        } else {
          para.appendChild(document.createTextNode(part));
        }
      });
      
      if (i < lines.length - 1) {
        para.appendChild(document.createElement('br'));
      }
    });
    
    elements.push(para);
  });
  
  return elements;
}

function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content) {
    if (typeof content === 'string') {
      el.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(child => el.appendChild(child));
    } else {
      el.appendChild(content);
    }
  }
  return el;
}

function createInfoBox(title, content, isWarning = false) {
  const box = createElement('div', isWarning ? 'warning-box' : 'info-box');
  
  const titleEl = createElement('div', isWarning ? 'warning-title' : 'info-title', title);
  box.appendChild(titleEl);
  
  const contentEl = createElement('div', isWarning ? 'warning-content' : 'info-content');
  formatTextToElements(content).forEach(el => contentEl.appendChild(el));
  box.appendChild(contentEl);
  
  return box;
}

function createSection(id, title, icon = '') {
  const section = createElement('section', 'section');
  section.id = id;
  
  const titleEl = createElement('h2', 'section__title', `${icon} ${title}`);
  section.appendChild(titleEl);
  
  return section;
}

function observeSections() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section--visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.section').forEach(section => {
    observer.observe(section);
  });
}

// ==========================================
// セクション生成関数
// ==========================================

function renderOverview(data, tocItems, sectionId) {
  if (!data.overview) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: 'この機能の本質' });
  
  const section = createSection(id, 'この機能の本質');
  
  const lead = createElement('div', 'lead');
  formatTextToElements(data.overview.short || data.overview.oneLiner || '')
    .forEach(el => lead.appendChild(el));
  section.appendChild(lead);
  
  if (data.overview.long) {
    const prose = createElement('div', 'prose');
    
    const titleMap = {
      essence: '本質',
      mechanism: '仕組み',
      comparison: '他機能との違い',
      jungView: 'Jungの見解'
    };
    
    for (const [key, value] of Object.entries(data.overview.long)) {
      const h3 = createElement('h3', null, titleMap[key] || key);
      prose.appendChild(h3);
      
      formatTextToElements(value).forEach(el => prose.appendChild(el));
    }
    
    section.appendChild(prose);
  }
  
  return { fragment: section, sectionId };
}

function renderCognitiveScience(data, tocItems, sectionId) {
  if (!data.cognitiveScience) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '脳科学から見たメカニズム' });
  
  const section = createSection(id, '脳科学から見たメカニズム', '🧠');
  
  if (data.cognitiveScience.scientificDisclaimer) {
    const disc = data.cognitiveScience.scientificDisclaimer;
    section.appendChild(createInfoBox(
      `⚠️ ${disc.title}`,
      disc.content,
      true
    ));
  }
  
  if (data.cognitiveScience.neuralBasis) {
    const prose = createElement('div', 'prose');
    formatTextToElements(data.cognitiveScience.neuralBasis)
      .forEach(el => prose.appendChild(el));
    section.appendChild(prose);
  }
  
  if (data.cognitiveScience.relatedProcesses && Array.isArray(data.cognitiveScience.relatedProcesses)) {
    const h3 = createElement('h3', null, '関連する認知プロセス');
    const prose = createElement('div', 'prose');
    prose.appendChild(h3);
    section.appendChild(prose);
    
    data.cognitiveScience.relatedProcesses.forEach(proc => {
      const content = proc.research 
        ? `${proc.relation}\n\n参考: ${proc.research}`
        : proc.relation;
      section.appendChild(createInfoBox(proc.process, content));
    });
  }
  
  if (data.cognitiveScience.limitations) {
    const h3 = createElement('h3', null, 'この機能の限界と補完方法');
    const prose = createElement('div', 'prose');
    prose.appendChild(h3);
    section.appendChild(prose);
    
    section.appendChild(createInfoBox(
      '⚠ 単独使用時の潜在的な懸念事項',
      data.cognitiveScience.limitations.scientificCaveats || '',
      true
    ));
    
    if (data.cognitiveScience.limitations.howToCompensate) {
      const comp = data.cognitiveScience.limitations.howToCompensate;
      const box = createElement('div', 'info-box');
      
      const title = createElement('div', 'info-title', `💡 ${comp.title || '限界を補う方法'}`);
      box.appendChild(title);
      
      const content = createElement('div', 'info-content');
      
      if (comp.strategies && Array.isArray(comp.strategies)) {
        comp.strategies.forEach(strat => {
          const stratDiv = createElement('div');
          stratDiv.style.marginBottom = '1.5rem';
          
          const limitP = createElement('p');
          const limitStrong = createElement('strong', null, `課題: ${strat.limitation}`);
          limitP.appendChild(limitStrong);
          stratDiv.appendChild(limitP);
          
          const funcP = createElement('p');
          funcP.innerHTML = `補完機能: <strong>${e(strat.compensatingFunction)}</strong>`;
          stratDiv.appendChild(funcP);
          
          formatTextToElements(strat.integration).forEach(el => stratDiv.appendChild(el));
          content.appendChild(stratDiv);
        });
      }
      
      if (comp.balancedApproach) {
        const divider = createElement('div');
        divider.style.marginTop = '1.5rem';
        divider.style.paddingTop = '1rem';
        divider.style.borderTop = '1px solid var(--border)';
        
        const balanceP = createElement('p');
        const balanceStrong = createElement('strong', null, 'バランスの取れたアプローチ:');
        balanceP.appendChild(balanceStrong);
        divider.appendChild(balanceP);
        
        formatTextToElements(comp.balancedApproach).forEach(el => divider.appendChild(el));
        content.appendChild(divider);
      }
      
      box.appendChild(content);
      section.appendChild(box);
    }
  }
  
  return { fragment: section, sectionId };
}

function renderCharacteristics(data, tocItems, sectionId) {
  if (!data.characteristics || !Array.isArray(data.characteristics)) {
    return { fragment: null, sectionId };
  }
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '5つの特性' });
  
  const section = createSection(id, '5つの特性', '✨');
  
  const grid = createElement('div', 'characteristics');
  
  data.characteristics.forEach((char, i) => {
    const card = createElement('div', 'characteristic-card');
    
    const titleDiv = createElement('div', 'characteristic-title');
    const icon = createElement('span', 'characteristic-icon', String(i + 1));
    const titleText = createElement('span', null, char.title || '');
    titleDiv.appendChild(icon);
    titleDiv.appendChild(titleText);
    card.appendChild(titleDiv);
    
    const desc = createElement('p', 'characteristic-desc');
    formatTextToElements(char.description || '').forEach(el => {
      while (el.firstChild) {
        desc.appendChild(el.firstChild);
      }
    });
    card.appendChild(desc);
    
    if (char.example) {
      const example = createElement('div', 'characteristic-example');
      example.innerHTML = `💡 例: ${e(char.example)}`;
      card.appendChild(example);
    }
    
    if (char.mechanism) {
      const mechanism = createElement('p');
      mechanism.style.marginTop = '0.75rem';
      mechanism.style.fontSize = '14px';
      mechanism.style.color = 'var(--text-muted)';
      mechanism.innerHTML = `<em>🔬 仕組み: ${e(char.mechanism)}</em>`;
      card.appendChild(mechanism);
    }
    
    grid.appendChild(card);
  });
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

function renderQuickCheck(data, tocItems, sectionId) {
  const quiz = data.userGuidance?.interactiveElement?.quickCheck;
  if (!quiz) return { fragment: null, sectionId, quiz: null };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '簡易チェック' });
  
  const section = createSection(id, quiz.title || '簡易チェック', '🎯');
  
  const quizCard = createElement('div', 'quiz-card');
  
  const title = createElement('div', 'quiz-title', quiz.subtitle || '以下の項目にいくつ当てはまりますか?');
  quizCard.appendChild(title);
  
  const subtitle = createElement('div', 'quiz-subtitle', quiz.disclaimer || '');
  quizCard.appendChild(subtitle);
  
  if (quiz.questions && Array.isArray(quiz.questions)) {
    quiz.questions.forEach((q, i) => {
      const questionDiv = createElement('div', 'quiz-question');
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `q${i}`;
      checkbox.className = 'quiz-checkbox';
      checkbox.dataset.weight = q.weight || 1;
      questionDiv.appendChild(checkbox);
      
      const label = document.createElement('label');
      label.htmlFor = `q${i}`;
      label.className = 'quiz-label';
      label.textContent = q.text;
      questionDiv.appendChild(label);
      
      quizCard.appendChild(questionDiv);
    });
  }
  
  const result = createElement('div', 'quiz-result');
  result.id = 'quiz-result';
  
  const score = createElement('div', 'quiz-score', `0/${quiz.questions.length}`);
  score.id = 'quiz-score';
  result.appendChild(score);
  
  const interpretation = createElement('div');
  interpretation.id = 'quiz-interpretation';
  result.appendChild(interpretation);
  
  quizCard.appendChild(result);
  section.appendChild(quizCard);
  
  return { fragment: section, sectionId, quiz };
}

function renderStrengthsWeaknesses(data, tocItems, sectionId) {
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '強みと弱み' });
  
  const section = createSection(id, '強みと弱み', '⚖️');
  
  const grid = createElement('div', 'strengths-weaknesses');
  
  const strengthCard = createElement('div', 'sw-card');
  const strengthTitle = createElement('div', 'sw-title');
  strengthTitle.innerHTML = '<span>✓</span><span>強み</span>';
  strengthCard.appendChild(strengthTitle);
  
  const strengthList = createElement('ul', 'sw-list strengths');
  if (data.strengths && Array.isArray(data.strengths)) {
    data.strengths.forEach(s => {
      const li = document.createElement('li');
      formatTextToElements(s).forEach(el => {
        while (el.firstChild) {
          li.appendChild(el.firstChild);
        }
      });
      strengthList.appendChild(li);
    });
  }
  strengthCard.appendChild(strengthList);
  grid.appendChild(strengthCard);
  
  const weaknessCard = createElement('div', 'sw-card');
  const weaknessTitle = createElement('div', 'sw-title');
  weaknessTitle.innerHTML = '<span>⚠</span><span>弱み(補完で改善可能)</span>';
  weaknessCard.appendChild(weaknessTitle);
  
  const weaknessList = createElement('ul', 'sw-list weaknesses');
  if (data.weaknesses && Array.isArray(data.weaknesses)) {
    data.weaknesses.forEach(w => {
      const li = document.createElement('li');
      formatTextToElements(w).forEach(el => {
        while (el.firstChild) {
          li.appendChild(el.firstChild);
        }
      });
      weaknessList.appendChild(li);
    });
  }
  weaknessCard.appendChild(weaknessList);
  grid.appendChild(weaknessCard);
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

function renderRealLifeExamples(data, tocItems, sectionId) {
  if (!data.realLifeExamples) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '実生活での現れ方' });
  
  const section = createSection(id, '実生活での現れ方', '🌍');
  
  const grid = createElement('div', 'examples-grid');
  
  const categoryNames = {
    work: '💼 仕事',
    relationships: '❤️ 人間関係',
    learning: '📚 学習',
    hobbies: '🎨 趣味・余暇'
  };
  
  for (const [category, examples] of Object.entries(data.realLifeExamples)) {
    if (Array.isArray(examples)) {
      const card = createElement('div', 'example-card');
      
      const categoryDiv = createElement('div', 'example-category', categoryNames[category] || category);
      card.appendChild(categoryDiv);
      
      const list = createElement('ul', 'example-list');
      examples.forEach(ex => {
        const li = document.createElement('li');
        formatTextToElements(ex).forEach(el => {
          while (el.firstChild) {
            li.appendChild(el.firstChild);
          }
        });
        list.appendChild(li);
      });
      card.appendChild(list);
      
      grid.appendChild(card);
    }
  }
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

function renderComparisons(data, tocItems, sectionId) {
  if (!data.comparisons) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '他の機能との比較' });
  
  const section = createSection(id, '他の機能との比較', '🔄');
  
  let html = '';
  
  if (data.comparisons.polarOpposite) {
    const comp = data.comparisons.polarOpposite;
    html += `<div class="comparison-card">
      <div class="comparison-header">${e(comp.title || '')}</div>
      <div class="comparison-vs">
        <span class="comparison-function">${data.code}</span>
        <span class="comparison-divider">vs</span>
        <span class="comparison-function">${comp.function}</span>
      </div>`;
    
    if (comp.keyDifferences && Array.isArray(comp.keyDifferences)) {
      html += `<table class="comparison-table">
        <thead>
          <tr>
            <th>観点</th>
            <th>${data.code}</th>
            <th>${comp.function}</th>
          </tr>
        </thead>
        <tbody>`;
      
      comp.keyDifferences.forEach(diff => {
        html += `<tr>
          <td><strong>${e(diff.aspect)}</strong></td>
          <td>${e(diff[data.code] || '')}</td>
          <td>${e(diff[comp.function] || '')}</td>
        </tr>`;
      });
      
      html += `</tbody></table>`;
    }
    
    html += `</div>`;
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  while (tempDiv.firstChild) {
    section.appendChild(tempDiv.firstChild);
  }
  
  return { fragment: section, sectionId };
}

function renderDevelopmentalStages(data, tocItems, sectionId) {
  if (!data.developmentalStages) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '人生の発達段階' });
  
  const section = createSection(id, '人生の発達段階', '🌱');
  
  const stages = [
    { key: 'childhood', label: '幼少期', icon: '👶' },
    { key: 'adolescence', label: '青年期', icon: '🧑' },
    { key: 'adulthood', label: '成人期', icon: '👨' },
    { key: 'maturity', label: '成熟期', icon: '👴' }
  ];
  
  const grid = createElement('div', 'stages-grid');
  
  stages.forEach(({ key, label, icon }) => {
    const stage = data.developmentalStages[key];
    if (!stage) return;
    
    const card = createElement('div', 'stage-card');
    
    const header = createElement('div', 'stage-header');
    const title = createElement('div', 'stage-title', `${icon} ${label}`);
    const age = createElement('div', 'stage-age', stage.age);
    header.appendChild(title);
    header.appendChild(age);
    card.appendChild(header);
    
    if (stage.characteristics && Array.isArray(stage.characteristics)) {
      const charBox = createInfoBox('✨ 特徴', stage.characteristics.join('\n\n'));
      card.appendChild(charBox);
    }
    
    if (stage.challenges && Array.isArray(stage.challenges)) {
      const challBox = createInfoBox('⚠️ 課題', stage.challenges.join('\n\n'), true);
      card.appendChild(challBox);
    }
    
    if (stage.support) {
      const supportBox = createInfoBox('💡 サポート', stage.support);
      card.appendChild(supportBox);
    } else if (stage.wisdom) {
      const wisdomBox = createInfoBox('💎 知恵', stage.wisdom);
      card.appendChild(wisdomBox);
    }
    
    grid.appendChild(card);
  });
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

function renderPracticalApplications(data, tocItems, sectionId) {
  if (!data.practicalApplications) return { fragment: null, sectionId };
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '実践的な活用法' });
  
  const section = createSection(id, '実践的な活用法', '🎯');
  
  const app = data.practicalApplications;
  
  if (app.career) {
    const h3 = createElement('h3', null, '💼 キャリアでの活かし方');
    section.appendChild(h3);
    
    if (app.career.ideal && Array.isArray(app.career.ideal)) {
      const idealBox = createInfoBox('✅ 適職', app.career.ideal.join('\n'));
      section.appendChild(idealBox);
    }
    
    if (app.career.strategies && Array.isArray(app.career.strategies)) {
      const stratBox = createInfoBox('💡 成功戦略', app.career.strategies.join('\n\n'));
      section.appendChild(stratBox);
    }
  }
  
  if (app.communication) {
    const h3 = createElement('h3', null, '💬 コミュニケーション改善法');
    section.appendChild(h3);
    
    if (app.communication.improvement && Array.isArray(app.communication.improvement)) {
      const commBox = createInfoBox('📝 改善ポイント', app.communication.improvement.join('\n\n'));
      section.appendChild(commBox);
    }
    
    if (app.communication.example) {
      const exBox = createInfoBox('📖 具体例', app.communication.example);
      section.appendChild(exBox);
    }
  }
  
  if (app.relationships) {
    const h3 = createElement('h3', null, '❤️ 人間関係でのアドバイス');
    section.appendChild(h3);
    
    if (app.relationships.advice) {
      const relBox = createInfoBox('💡 アドバイス', app.relationships.advice);
      section.appendChild(relBox);
    }
  }
  
  if (app.problemSolving) {
    const h3 = createElement('h3', null, '🧩 問題解決アプローチ');
    section.appendChild(h3);
    
    if (app.problemSolving.process && Array.isArray(app.problemSolving.process)) {
      const procBox = createInfoBox('📋 プロセス', app.problemSolving.process.join('\n'));
      section.appendChild(procBox);
    }
    
    if (app.problemSolving.tips && Array.isArray(app.problemSolving.tips)) {
      const tipsBox = createInfoBox('💡 ヒント', app.problemSolving.tips.join('\n'));
      section.appendChild(tipsBox);
    }
  }
  
  return { fragment: section, sectionId };
}

function renderMisconceptions(data, tocItems, sectionId) {
  if (!data.misconceptions || !Array.isArray(data.misconceptions)) {
    return { fragment: null, sectionId };
  }
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: 'よくある誤解' });
  
  const section = createSection(id, 'よくある誤解', '❓');
  
  const grid = createElement('div', 'misconceptions-grid');
  
  data.misconceptions.forEach((item, i) => {
    const card = createElement('div', 'misconception-card');
    
    const mythDiv = createElement('div', 'misconception-myth');
    const mythIcon = createElement('span', 'misconception-icon', '❌');
    const mythText = createElement('span', null, item.myth);
    mythDiv.appendChild(mythIcon);
    mythDiv.appendChild(mythText);
    card.appendChild(mythDiv);
    
    const truthDiv = createElement('div', 'misconception-truth');
    const truthIcon = createElement('span', 'misconception-icon', '✅');
    const truthText = createElement('div');
    formatTextToElements(item.truth).forEach(el => truthText.appendChild(el));
    truthDiv.appendChild(truthIcon);
    truthDiv.appendChild(truthText);
    card.appendChild(truthDiv);
    
    if (item.clarification) {
      const clarDiv = createElement('div', 'misconception-clarification');
      clarDiv.innerHTML = `💡 ${e(item.clarification)}`;
      card.appendChild(clarDiv);
    }
    
    grid.appendChild(card);
  });
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

function renderFamousPeople(data, tocItems, sectionId) {
  if (!data.famousPeople || !Array.isArray(data.famousPeople)) {
    return { fragment: null, sectionId };
  }
  
  const id = `section-${sectionId++}`;
  tocItems.push({ id, title: '有名人の例' });
  
  const section = createSection(id, '有名人の例', '🌟');
  
  const selected = data.famousPeople.slice(0, 6);
  
  const grid = createElement('div', 'famous-grid');
  
  selected.forEach(person => {
    const card = createElement('div', 'famous-card');
    
    const header = createElement('div', 'famous-header');
    const name = createElement('div', 'famous-name', person.name);
    const type = createElement('div', 'famous-type', person.type);
    header.appendChild(name);
    header.appendChild(type);
    card.appendChild(header);
    
    const reason = createElement('p', 'famous-reason', person.reason);
    card.appendChild(reason);
    
    if (person.quote) {
      const quote = createElement('div', 'famous-quote', `"${person.quote}"`);
      card.appendChild(quote);
    }
    
    grid.appendChild(card);
  });
  
  section.appendChild(grid);
  return { fragment: section, sectionId };
}

// ==========================================
// メインロード関数
// ==========================================

async function loadData() {
  try {
    console.log('Loading:', code);
    
    const res = await fetch(`data/${code}.json`);
    console.log('Response status:', res.status);
    
    if (!res.ok) throw new Error(`${code}.json が見つかりません`);
    
    const data = await res.json();
    console.log('Data loaded:', data);

    document.getElementById('page-title').textContent = 
      `${data.name}(${data.code})完全ガイド — Persona Finder`;
    
    if (data.seo?.ja) {
      document.getElementById('page-description').setAttribute('content', data.seo.ja.description);
    }

    document.getElementById('hero-code').textContent = data.code || '';
    document.getElementById('hero-name').textContent = data.name || data.nameEn || '';
    document.getElementById('hero-tagline').textContent = data.tagline || '';
    
    const tagsContainer = document.getElementById('hero-tags');
    if (data.tags && Array.isArray(data.tags)) {
      const fragment = document.createDocumentFragment();
      data.tags.forEach(tag => {
        const span = createElement('span', 'tag', tag);
        fragment.appendChild(span);
      });
      tagsContainer.innerHTML = '';
      tagsContainer.appendChild(fragment);
    }

    const tocItems = [];
    let sectionId = 0;
    let quiz = null;

    const mainFragment = document.createDocumentFragment();

    const tocSection = createSection('toc-section', '目次', '📖');
    const tocContent = createElement('div');
    tocContent.id = 'toc-content';
    tocSection.appendChild(tocContent);
    mainFragment.appendChild(tocSection);

    let result;
    
    result = renderOverview(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderCognitiveScience(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderCharacteristics(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderQuickCheck(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    quiz = result.quiz;

    result = renderStrengthsWeaknesses(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderRealLifeExamples(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderComparisons(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    // 新規追加セクション
    result = renderDevelopmentalStages(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderPracticalApplications(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderMisconceptions(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    result = renderFamousPeople(data, tocItems, sectionId);
    if (result.fragment) mainFragment.appendChild(result.fragment);
    sectionId = result.sectionId;
    
    // DOM更新
    const mainContainer = document.querySelector('.main-content .container');
    if (mainContainer) {
      mainContainer.innerHTML = '';
      mainContainer.appendChild(mainFragment);
    }

    // 目次生成
    const tocNav = createElement('nav', 'toc-nav');
    const tocList = createElement('ul', 'toc-list');
    
    tocItems.forEach((item, i) => {
      const li = createElement('li', 'toc-item');
      const a = document.createElement('a');
      a.href = `#${item.id}`;
      a.className = 'toc-link';
      
      const number = createElement('span', 'toc-number', (i + 1).toString().padStart(2, '0'));
      const title = createElement('span', 'toc-title', item.title);
      
      a.appendChild(number);
      a.appendChild(title);
      li.appendChild(a);
      tocList.appendChild(li);
    });
    
    tocNav.appendChild(tocList);
    
    const tocContentEl = document.getElementById('toc-content');
    if (tocContentEl) {
      tocContentEl.appendChild(tocNav);
    }

    // 簡易テストのイベントリスナー設定
    if (quiz) {
      setupQuizListeners(quiz);
    }

    // セクション可視化の監視開始
    observeSections();

    console.log('✅ Page rendered successfully');

  } catch (err) {
    console.error('❌ Error:', err);
    const mainContainer = document.querySelector('.main-content .container');
    if (mainContainer) {
      mainContainer.innerHTML = 
        `<div class="warning-box">
          <div class="warning-title">⚠️ エラー</div>
          <div class="warning-content">
            <p>${e(err.message)}</p>
          </div>
        </div>`;
    }
  }
}

function setupQuizListeners(quiz) {
  const checkboxes = document.querySelectorAll('.quiz-checkbox');
  const result = document.getElementById('quiz-result');
  const scoreEl = document.getElementById('quiz-score');
  const interpEl = document.getElementById('quiz-interpretation');
  
  if (!checkboxes.length || !result || !scoreEl || !interpEl) return;
  
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(checkboxes).filter(c => c.checked).length;
      const total = checkboxes.length;
      scoreEl.textContent = `${checked}/${total}`;
      
      let scoringData = null;
      
      if (checked >= 4 && quiz.scoring.high) {
        scoringData = quiz.scoring.high;
      } else if (checked >= 2 && quiz.scoring.medium) {
        scoringData = quiz.scoring.medium;
      } else if (quiz.scoring.low) {
        scoringData = quiz.scoring.low;
      }
      
      if (scoringData) {
        const fragment = document.createDocumentFragment();
        
        const h3 = createElement('h3', null, scoringData.result);
        fragment.appendChild(h3);
        
        const p1 = createElement('p', null, scoringData.message);
        fragment.appendChild(p1);
        
        const p2 = createElement('p');
        const strong = createElement('strong', null, '該当タイプ:');
        p2.appendChild(strong);
        p2.appendChild(document.createTextNode(` ${scoringData.types.join(', ')}`));
        fragment.appendChild(p2);
        
        const p3 = createElement('p', null, scoringData.nextAction);
        fragment.appendChild(p3);
        
        interpEl.innerHTML = '';
        interpEl.appendChild(fragment);
      }
      
      result.classList.add('show');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}