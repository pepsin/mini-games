// Example: Using Flex Layout System
// This shows how to use the flex layout for auto-resizing containers

const { flexContainer, flexItem } = require('./js/flexLayout.js');
const { roundedRect } = require('./js/roundedRect.js');

// Example 1: Simple horizontal row with auto-sized container
function createHorizontalToolbar(ctx, x, y) {
  return flexContainer()
    .position(x, y)
    .autoSize(100, 40) // minWidth, minHeight
    .direction('row')
    .justify('center')
    .align('center')
    .setGap(10)
    .setPadding(10)
    .background('#ffffff55')
    .border(2, '#444')
    .cornerRadius(8)
    .addChildren(
      flexItem()
        .text('按钮1', 16)
        .background('#FF6B35')
        .textStyle('#FFF', 16)
        .padding(8)
        .cornerRadius(4),
      flexItem()
        .text('按钮2', 16)
        .background('#4ECDC4')
        .textStyle('#FFF', 16)
        .padding(8)
        .cornerRadius(4),
      flexItem()
        .text('按钮3', 16)
        .background('#FFD700')
        .textStyle('#333', 16)
        .padding(8)
        .cornerRadius(4)
    );
}

// Example 2: Vertical sidebar with flex items
function createSidebar(ctx, x, y) {
  return flexContainer()
    .position(x, y)
    .size(200, null) // fixed width, auto height
    .direction('column')
    .justify('flex-start')
    .align('stretch')
    .setGap(8)
    .setPadding(15)
    .background('#333')
    .border(2, '#555')
    .cornerRadius(12)
    .addChildren(
      flexItem()
        .text('菜单项 1', 18)
        .textStyle('#FFF', 18)
        .padding(10)
        .background('#444')
        .cornerRadius(6),
      flexItem()
        .text('菜单项 2', 18)
        .textStyle('#FFF', 18)
        .padding(10)
        .background('#444')
        .cornerRadius(6),
      flexItem()
        .text('菜单项 3', 18)
        .textStyle('#FFF', 18)
        .padding(10)
        .background('#444')
        .cornerRadius(6)
    );
}

// Example 3: Score panel with flex layout (replacing the existing one)
function createScorePanel(ctx, score, highScore, x, y) {
  return flexContainer()
    .position(x, y)
    .autoSize(200, 40)
    .direction('row')
    .justify('space-between')
    .align('center')
    .setGap(20)
    .setPadding({ left: 12, right: 12, top: 8, bottom: 8 })
    .background('#ffffff55')
    .border(2, '#444')
    .cornerRadius(8)
    .addChildren(
      flexItem()
        .text(`分数: ${score}`, 20)
        .textStyle('#444', 20, 'Arial', 'bold'),
      flexItem()
        .text(`最高: ${highScore}`, 16)
        .textStyle('#666', 16)
    );
}

// Example 4: Game over panel with centered content
function createGameOverPanel(ctx, score, highScore, wave, x, y) {
  const panel = flexContainer()
    .position(x, y)
    .autoSize(300, 200)
    .direction('column')
    .justify('center')
    .align('center')
    .setGap(15)
    .setPadding(20)
    .background('#FFFFFF')
    .border(6, '#FF6B35')
    .cornerRadius(16);
  
  // Add title
  panel.addChild(
    flexItem()
      .text('游戏结束', 32)
      .textStyle('#FF6B35', 32, 'Arial', 'bold')
  );
  
  // Add stats
  panel.addChild(
    flexContainer()
      .direction('column')
      .justify('center')
      .align('center')
      .setGap(8)
      .addChildren(
        flexItem().text(`坚持到第 ${wave} 波!`, 24).textStyle('#333', 24),
        flexItem().text(`分数: ${score}`, 20).textStyle('#333', 20, 'Arial', 'bold'),
        flexItem().text(`最高分: ${highScore}`, 16).textStyle('#ff6f00', 16, 'Arial', 'bold')
      )
  );
  
  // Add button
  panel.addChild(
    flexItem()
      .text('再来一次', 22)
      .textStyle('#FFF', 22, 'Arial', 'bold')
      .background('#FF6B35')
      .padding({ left: 30, right: 30, top: 12, bottom: 12 })
      .cornerRadius(12)
  );
  
  return panel;
}

// Example 5: Using with existing roundedRect components
function createMixedLayout(ctx, x, y) {
  return flexContainer()
    .position(x, y)
    .autoSize(300, 100)
    .direction('row')
    .justify('space-around')
    .align('center')
    .setGap(10)
    .setPadding(15)
    .background('#f0f0f0')
    .cornerRadius(10)
    .addChildren(
      // Mix flex items with existing roundedRect components
      roundedRect()
        .size(80, 40)
        .cornerRadius(8)
        .background('#FF6B35')
        .setText('按钮A')
        .textStyle('#FFF', 16, 'Arial', 'bold')
        .align('center', 'middle'),
      
      flexItem()
        .text('或', 14)
        .textStyle('#666', 14),
      
      roundedRect()
        .size(80, 40)
        .cornerRadius(8)
        .background('#4ECDC4')
        .setText('按钮B')
        .textStyle('#FFF', 16, 'Arial', 'bold')
        .align('center', 'middle')
    );
}

// Usage in your game:
// 
// In your draw function:
// const toolbar = createHorizontalToolbar(ctx, 10, 10);
// toolbar.draw(ctx);
//
// Or inline:
// flexContainer()
//   .position(10, 10)
//   .autoSize(100, 40)
//   .direction('row')
//   .setGap(10)
//   .addChild(flexItem().text('Hello', 20))
//   .draw(ctx);

module.exports = {
  createHorizontalToolbar,
  createSidebar,
  createScorePanel,
  createGameOverPanel,
  createMixedLayout
};