// Пути к ассетам
const goods = [
  { type: "milk", img: "milk.png" },
  { type: "chocolate", img: "chocolate.png" },
  { type: "cola", img: "cola.png" },
];

const shelfImg = "shelf.png";
const NUM_SHELVES = 4; // 4-я полка используется как буфер

// Состояние игры
let shelves = [];
let dragging = null;
let gameProgress = 100; // 0-100% - временно 100% для тестирования

function shuffle(array) {
  for(let i = array.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function initGame() {
  console.log("Initializing game...");
  const itemsArr = [];
  for (const g of goods) {
    for (let i = 0; i < 3; ++i) itemsArr.push({ type: g.type, img: g.img });
  }
  shuffle(itemsArr);

  // Случайная буферная полка (останется пустой)
  const bufferIdx = Math.floor(Math.random() * NUM_SHELVES);
  shelves = Array.from({ length: NUM_SHELVES }, () => []);
  // Раскладываем 9 предметов по 3 оставшимся полкам случайно, по 3 на каждую
  for (const item of itemsArr) {
    const eligibleShelves = [];
    for (let i = 0; i < NUM_SHELVES; i++) {
      if (i === bufferIdx) continue;
      if (shelves[i].length < 3) eligibleShelves.push(i);
    }
    const target = eligibleShelves[Math.floor(Math.random() * eligibleShelves.length)];
    shelves[target].push(item);
  }

  console.log("Shelves:", shelves);
  gameProgress = 100; // Временно всегда 100% для тестирования
  updateProgress();
  showPromoOverlay();
  renderGame();
}

function checkWin() {
  // Победа уровня: ровно 3 полки заполнены 3 одинаковыми товарами, а оставшаяся полка пуста
  let completeCount = 0;
  let valid = true;
  for (const shelf of shelves) {
    if (shelf.length === 0) continue; // буферная пустая полка допустима
    if (shelf.length === 3 && shelf.every(item => item.type === shelf[0].type)) {
      completeCount++;
    } else {
      valid = false;
      break;
    }
  }
  const levelCompleted = valid && completeCount === 3;
  if (levelCompleted) {
    gameProgress = 100; // 100% за прохождение уровня
    updateProgress();
  }
}

function renderGame() {
  console.log("Rendering game...");
  const game = document.getElementById("game");
  if (!game) {
    console.error("Game element not found!");
    return;
  }
  game.innerHTML = "";
  console.log("Number of shelves:", shelves.length);
  shelves.forEach((items, shelfIdx) => {
    const shelf = document.createElement("div");
    shelf.className = "shelf-row";
    shelf.dataset.shelf = shelfIdx;

    // фон полки
    const bg = document.createElement("img");
    bg.src = shelfImg;
    bg.className = "shelf-bg";
    shelf.appendChild(bg);

    // товары на полке
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "shelf-items";
    itemsDiv.dataset.shelf = shelfIdx;
    for (let i = 0; i < 3; ++i) {
      const itemContainer = document.createElement("div");
      itemContainer.className = "item-container";
      
      if (items[i]) {
        const item = document.createElement("img");
        item.src = items[i].img;
        item.className = "item";
        // Можно перетаскивать только крайний справа товар
        const isRightmost = i === items.length - 1;
        item.draggable = isRightmost;
        item.dataset.type = items[i].type;
        item.dataset.shelf = shelfIdx;
        item.dataset.idx = i;
        if (isRightmost) {
          item.style.cursor = "grab";
          console.log(`Item ${items[i].type} on shelf ${shelfIdx} is draggable (rightmost)`);
        } else {
          item.style.cursor = "not-allowed";
          console.log(`Item ${items[i].type} on shelf ${shelfIdx} is NOT draggable (not rightmost)`);
        }
        // drag events
        item.addEventListener("dragstart", dragStart);
        item.addEventListener("dragend", dragEnd);
        itemContainer.appendChild(item);
      }
      itemsDiv.appendChild(itemContainer);
    }
    shelf.appendChild(itemsDiv);

    // крышка полки (поверх товаров)
    const cover = document.createElement("img");
    cover.src = "shelf_cover.png";
    cover.className = "shelf-cover";
    shelf.appendChild(cover);

    // drag over/drop events (на всю полку)
    shelf.addEventListener("dragenter", dragOver);
    shelf.addEventListener("dragover", dragOver);
    shelf.addEventListener("dragleave", dragLeave);
    shelf.addEventListener("drop", dropItem);

    game.appendChild(shelf);
  });
  
  // Обновляем размеры контейнеров товаров после рендера
  updateItemContainers();
  
  // Перепривязываем touch события после рендера
  bindTouchEvents();
}

// TOUCH EVENTS for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchElement = null;
let touchStartTime = 0;
let lastValidShelf = null; // Запоминаем последнюю валидную полку



function updateShelvesAfterMove() {
  // Обновляем только атрибуты существующих товаров без пересоздания
  shelves.forEach((items, shelfIdx) => {
    const shelfItems = document.querySelector(`.shelf-items[data-shelf="${shelfIdx}"]`);
    if (!shelfItems) return;
    
    const itemContainers = shelfItems.querySelectorAll('.item-container');
    
    for (let i = 0; i < 3; ++i) {
      const itemContainer = itemContainers[i];
      if (!itemContainer) continue;
      
      const existingItem = itemContainer.querySelector('.item');
      
      if (items[i]) {
        // Если товар есть в данных, обновляем существующий или создаем новый
        if (existingItem) {
          // Обновляем существующий товар
          existingItem.src = items[i].img;
          existingItem.dataset.type = items[i].type;
          existingItem.dataset.shelf = shelfIdx;
          existingItem.dataset.idx = i;
        } else {
          // Создаем новый товар
          const item = document.createElement("img");
          item.src = items[i].img;
          item.className = "item";
          item.dataset.type = items[i].type;
          item.dataset.shelf = shelfIdx;
          item.dataset.idx = i;
          
          // Add drag events
          item.addEventListener("dragstart", dragStart);
          item.addEventListener("dragend", dragEnd);
          
          itemContainer.appendChild(item);
        }
        
        // Обновляем draggable статус
        const isRightmost = i === items.length - 1;
        const item = itemContainer.querySelector('.item');
        item.draggable = isRightmost;
        
        if (isRightmost) {
          item.style.cursor = "grab";
          // Add touch events только если их еще нет
          if (!item.hasAttribute('data-touch-bound')) {
            item.addEventListener("touchstart", handleTouchStart, { passive: false });
            item.addEventListener("touchmove", handleTouchMove, { passive: false });
            item.addEventListener("touchend", handleTouchEnd, { passive: false });
            item.setAttribute('data-touch-bound', 'true');
          }
        } else {
          item.style.cursor = "not-allowed";
          // Remove touch events
          item.removeEventListener("touchstart", handleTouchStart);
          item.removeEventListener("touchmove", handleTouchMove);
          item.removeEventListener("touchend", handleTouchEnd);
          item.removeAttribute('data-touch-bound');
        }
      } else {
        // Если товара нет в данных, удаляем существующий
        if (existingItem) {
          existingItem.remove();
        }
      }
    }
  });
  
  // Обновляем размеры контейнеров товаров
  updateItemContainers();
}

function bindTouchEvents() {
  const items = document.querySelectorAll('.item');
  console.log('Binding touch events to', items.length, 'items');
  
  items.forEach((item, index) => {
    // Удаляем старые обработчики
    item.removeEventListener("touchstart", handleTouchStart);
    item.removeEventListener("touchmove", handleTouchMove);
    item.removeEventListener("touchend", handleTouchEnd);
    
    // Добавляем touch события только к перетаскиваемым элементам
    if (item.draggable) {
      item.addEventListener("touchstart", handleTouchStart, { passive: false });
      item.addEventListener("touchmove", handleTouchMove, { passive: false });
      item.addEventListener("touchend", handleTouchEnd, { passive: false });
      console.log(`Touch events bound to draggable item ${index}`);
    } else {
      console.log(`Skipping non-draggable item ${index}`);
    }
  });
}

function handleTouchStart(e) {
  console.log('Touch start on:', e.target, 'draggable:', e.target.draggable);
  if (!e.target.draggable) {
    console.log('Item not draggable, ignoring touch');
    return;
  }
  
  touchElement = e.target;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  lastValidShelf = null; // Сбрасываем запомненную полку
  
  console.log('Touch element set:', touchElement);
  e.preventDefault();
}

function handleTouchMove(e) {
  if (!touchElement) return;
  
  e.preventDefault();
  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  
  // Only start dragging if moved more than 10px
  if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
    touchElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    touchElement.style.opacity = '0.5';
    touchElement.style.zIndex = '1000';
    
    // Ищем полку в нескольких точках для более надежного определения
    let targetShelf = null;
    const checkPoints = [
      { x: touch.clientX, y: touch.clientY },
      { x: touch.clientX, y: touch.clientY - 30 },
      { x: touch.clientX, y: touch.clientY + 30 },
      { x: touch.clientX - 30, y: touch.clientY },
      { x: touch.clientX + 30, y: touch.clientY },
      { x: touch.clientX, y: touch.clientY - 60 },
      { x: touch.clientX, y: touch.clientY + 60 },
      { x: touch.clientX - 60, y: touch.clientY },
      { x: touch.clientX + 60, y: touch.clientY }
    ];
    
    // Временно скрываем перетаскиваемый элемент для корректного elementFromPoint
    const originalDisplay = touchElement.style.display;
    touchElement.style.display = 'none';
    
    for (const point of checkPoints) {
      const elementBelow = document.elementFromPoint(point.x, point.y);
      const shelfRow = elementBelow?.closest('.shelf-row');
      if (shelfRow) {
        targetShelf = shelfRow;
        break;
      }
    }
    
    // Восстанавливаем отображение элемента
    touchElement.style.display = originalDisplay;
    
    // Если не нашли через elementFromPoint, попробуем найти по позиции
    if (!targetShelf) {
      const allShelves = document.querySelectorAll('.shelf-row');
      for (const shelf of allShelves) {
        const rect = shelf.getBoundingClientRect();
        // Расширяем зону поиска для более надежного определения
        const expandedRect = {
          left: rect.left - 20,
          right: rect.right + 20,
          top: rect.top - 20,
          bottom: rect.bottom + 20
        };
        if (touch.clientX >= expandedRect.left && touch.clientX <= expandedRect.right && 
            touch.clientY >= expandedRect.top && touch.clientY <= expandedRect.bottom) {
          targetShelf = shelf;
          break;
        }
      }
    }
    
    // Подсветка убрана - только запоминаем полку
    if (targetShelf) {
      lastValidShelf = targetShelf; // Запоминаем последнюю валидную полку
    }
  }
}

function handleTouchEnd(e) {
  console.log('Touch end, touchElement:', touchElement);
  if (!touchElement) return;
  
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const touchDuration = Date.now() - touchStartTime;
  
  console.log('Touch delta:', deltaX, deltaY, 'duration:', touchDuration);
  
  // Check if it was a drag (moved more than 10px or took more than 200ms)
  if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10 || touchDuration > 200) {
    console.log('Touch was a drag, using last valid shelf');
    
    // Если нет запомненной полки, попробуем найти её
    if (!lastValidShelf) {
      // Используем правильные координаты (начальная позиция + смещение)
      const finalX = touchStartX + deltaX;
      const finalY = touchStartY + deltaY;
      
      const checkPoints = [
        { x: finalX, y: finalY },
        { x: finalX, y: finalY - 30 },
        { x: finalX, y: finalY + 30 },
        { x: finalX - 30, y: finalY },
        { x: finalX + 30, y: finalY },
        { x: finalX, y: finalY - 60 },
        { x: finalX, y: finalY + 60 },
        { x: finalX - 60, y: finalY },
        { x: finalX + 60, y: finalY }
      ];
      
      // Временно скрываем перетаскиваемый элемент для корректного elementFromPoint
      const originalDisplay = touchElement.style.display;
      touchElement.style.display = 'none';
      
      for (const point of checkPoints) {
        const elementBelow = document.elementFromPoint(point.x, point.y);
        const shelfRow = elementBelow?.closest('.shelf-row');
        if (shelfRow) {
          lastValidShelf = shelfRow;
          console.log('Shelf found in touchEnd at point:', point, 'shelf:', shelfRow.dataset.shelf);
          break;
        }
      }
      
      // Восстанавливаем отображение элемента
      touchElement.style.display = originalDisplay;
      
      // Если не нашли через elementFromPoint, попробуем найти по позиции
      if (!lastValidShelf) {
        const allShelves = document.querySelectorAll('.shelf-row');
        for (const shelf of allShelves) {
          const rect = shelf.getBoundingClientRect();
          // Расширяем зону поиска для более надежного определения
          const expandedRect = {
            left: rect.left - 20,
            right: rect.right + 20,
            top: rect.top - 20,
            bottom: rect.bottom + 20
          };
          if (finalX >= expandedRect.left && finalX <= expandedRect.right && 
              finalY >= expandedRect.top && finalY <= expandedRect.bottom) {
            lastValidShelf = shelf;
            console.log('Shelf found by position in touchEnd:', shelf.dataset.shelf);
            break;
          }
        }
      }
    }
    
    // Используем найденную или запомненную полку для drop
    if (lastValidShelf) {
      // Perform the drop
      const shelfIdx = +lastValidShelf.dataset.shelf;
      const fromShelf = +touchElement.dataset.shelf;
      const fromIdx = +touchElement.dataset.idx;
      
      console.log('Dropping from shelf', fromShelf, 'to shelf', shelfIdx);
      
      if (shelfIdx === fromShelf) {
        // Товар возвращается на ту же полку - просто обновляем отображение
        console.log('Item returned to same shelf, updating display');
        updateShelvesAfterMove();
      } else if (shelves[shelfIdx].length < 3) {
        // Товар перемещается на другую полку
        const item = shelves[fromShelf][fromIdx];
        shelves[fromShelf].splice(fromIdx, 1);
        shelves[shelfIdx].push(item);
        
        console.log('Item moved, updating shelves');
        updateShelvesAfterMove();
        checkWin();
      } else {
        console.log('Drop not allowed - shelf full');
      }
    } else {
      console.log('No valid drop target found - no lastValidShelf');
    }
  } else {
    console.log('Touch was not a drag');
  }
  
  // Reset element
  touchElement.style.transform = '';
  touchElement.style.opacity = '';
  touchElement.style.zIndex = '';
  
  // Подсветка убрана
  
  touchElement = null;
}

// DRAG & DROP
function dragStart(e) {
  dragging = {
    fromShelf: +e.target.dataset.shelf,
    fromIdx: +e.target.dataset.idx,
    item: shelves[+e.target.dataset.shelf][+e.target.dataset.idx]
  };
  e.target.classList.add("dragging");
  setTimeout(() => e.target.style.opacity = "0.5", 0);
}

function dragEnd(e) {
  e.target.classList.remove("dragging");
  e.target.style.opacity = "";
  dragging = null;
  clearDrops();
}

function dragOver(e) {
  e.preventDefault();
  const shelfIdx = +this.dataset.shelf;
  if (!dragging) return;
  // Подсветка убрана
}

function dragLeave(e) {
  // Подсветка убрана
}

function dropItem(e) {
  e.preventDefault();
  const shelfIdx = +this.dataset.shelf;
  if (!dragging) return;
  if (shelves[shelfIdx].length < 3 && shelfIdx !== dragging.fromShelf) {
    shelves[dragging.fromShelf].splice(dragging.fromIdx, 1);
    shelves[shelfIdx].push(dragging.item);
    renderGame();
    checkWin();
  }
  clearDrops();
}

function updateProgress() {
  const progressFill = document.getElementById("progress-fill");
  const progressAsset = document.getElementById("progress-asset");
  const progressBar = document.getElementById("progress-bar");
  
  if (progressFill && progressAsset && progressBar) {
    progressFill.style.width = gameProgress + "%";
    const barWidth = progressBar.offsetWidth;
    const assetHalf = progressAsset.offsetWidth / 2; // 60px при 120px ширине
    const assetPosition = (barWidth * gameProgress / 100) - assetHalf;
    progressAsset.style.left = Math.max(-assetHalf, assetPosition) + "px";
    
    // Показываем промо-оверлей при достижении 100%
    if (gameProgress >= 100) {
      showPromoOverlay();
    }
  }
}

function showPromoOverlay() {
  const overlay = document.getElementById("promo-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    
    // Показываем только box1, box скрыт
    const box1 = document.getElementById("promo-box1-asset");
    const box = document.getElementById("promo-box-asset");
    
    if (box1) {
      box1.style.display = "block";
      box1.style.opacity = "1";
    }
    if (box) {
      box.style.display = "none";
      box.style.opacity = "0";
    }
  }
}

function claimPromo() {
  const button = document.getElementById("promo-button");
  const box1 = document.getElementById("promo-box1-asset");
  const box = document.getElementById("promo-box-asset");
  
  // Анимация нажатия кнопки
  if (button) {
    // Прижимаем кнопку вниз
    button.style.transform = "translateX(-50%) translateY(10px)";
    button.style.boxShadow = "0 -10px 0 #146708, 0 2px 0 #146708";
    button.style.borderTop = "4px solid #0FAD0D";
    button.style.borderBottom = "none";
    button.style.transition = "transform 0.1s ease, box-shadow 0.1s ease, border 0.1s ease";
    
    // Задержка на 0.3 секунды
    setTimeout(() => {
      // Возвращаем кнопку в исходное положение
      button.style.transform = "translateX(-50%) translateY(0px)";
      button.style.boxShadow = "0 12px 0 #146708";
      button.style.borderTop = "4px solid #7DEC02";
      button.style.borderBottom = "4px solid #0FAD0D";
      button.style.transition = "transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease";
    }, 300);
  }
  
  // Скрываем box1 без анимации
  if (box1) {
    box1.style.display = "none";
  }
  
  // Показываем box
  if (box) {
    box.style.display = "block";
    box.style.opacity = "1";
  }
}

function hidePromoOverlay() {
  const overlay = document.getElementById("promo-overlay");
  if (overlay) {
    overlay.style.display = "none";
    
    // Сбрасываем состояние коробок
    const box1 = document.getElementById("promo-box1-asset");
    const box = document.getElementById("promo-box-asset");
    
    if (box1) {
      box1.style.display = "none";
      box1.style.opacity = "1";
      box1.style.animation = "boxFall 0.5s ease-in forwards";
    }
    if (box) {
      box.style.display = "none";
      box.style.opacity = "0";
      box.style.animation = "none";
    }
  }
}

function clearDrops() {
  // Подсветка убрана
}

// Обновляем размеры контейнеров товаров и полок
function updateItemContainers() {
  const isMobile = window.innerWidth <= 768;
  const itemContainers = document.querySelectorAll('.item-container');
  const shelfItems = document.querySelectorAll('.shelf-items');
  
  itemContainers.forEach(container => {
    if (isMobile) {
      // На мобильном: 80vw * 0.6 / 3
      container.style.width = 'calc(80vw * 0.6 / 3)';
    } else {
      // На десктопе: 20vw * 0.6 / 3
      container.style.width = 'calc(20vw * 0.6 / 3)';
    }
  });
  
  shelfItems.forEach(shelf => {
    if (isMobile) {
      // На мобильном: уменьшаем padding
      shelf.style.padding = '0 2vw';
    } else {
      // На десктопе: стандартный padding
      shelf.style.padding = '0 5vw';
    }
  });
  
  // Обновляем высоту полок
  const shelfRows = document.querySelectorAll('.shelf-row');
  shelfRows.forEach(shelf => {
    if (isMobile) {
      // На мобильном: адаптивная высота
      shelf.style.height = 'calc((80vh - 120px) / 4)';
    } else {
      // На десктопе: стандартная высота
      shelf.style.height = 'calc((70vh - 120px) / 4)';
    }
  });
}

// Определяем мобильное устройство и применяем стили
function applyMobileStyles() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.add('mobile');
    const game = document.getElementById('game');
    const progressContainer = document.getElementById('progress-container');
    
    // Применяем CSS переменные для масштабирования
    const scale = Math.max(0.5, Math.min(1, window.innerWidth / 375));
    const itemScale = scale * 0.9;
    
    document.documentElement.style.setProperty('--scale', scale);
    document.documentElement.style.setProperty('--item-scale', itemScale);
    
    if (game) {
      game.style.width = '80vw';
      game.style.marginLeft = '24px';
      game.style.marginRight = '24px';
    }
    
    // Уменьшаем padding-top контейнера на мобильном
    const container = document.getElementById('container');
    if (container) {
      container.style.paddingTop = '24px';
    }
    
    if (progressContainer) {
      progressContainer.style.width = '80vw';
      
      // Обновляем высоту прогресс-бара на мобильном
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.style.height = '32px';
      }
      
      // Устанавливаем размер ассета delivery bag на мобильном
      const progressAsset = document.getElementById('progress-asset');
      if (progressAsset) {
        progressAsset.style.width = '60px';
        progressAsset.style.height = '60px';
      }
    }
    
    // Обновляем размеры контейнеров товаров
    updateItemContainers();
  } else {
    // Сбрасываем переменные для десктопа
    document.documentElement.style.setProperty('--scale', '1');
    document.documentElement.style.setProperty('--item-scale', '0.9');
    
    // Сбрасываем padding-top для десктопа
    const container = document.getElementById('container');
    if (container) {
      container.style.paddingTop = '48px';
    }
    
    // Сбрасываем высоту прогресс-бара для десктопа
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.height = '48px';
    }
    
    // Увеличиваем ассет delivery bag на десктопе
    const progressAsset = document.getElementById('progress-asset');
    if (progressAsset) {
      progressAsset.style.width = '120px';
      progressAsset.style.height = '120px';
    }
  }
}

window.onload = function() {
  applyMobileStyles();
  initGame();
  bindTouchEvents();
};

// Применяем стили при изменении размера окна
window.addEventListener('resize', () => {
  applyMobileStyles();
});