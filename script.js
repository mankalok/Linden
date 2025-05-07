"use strict";

// --- DOM Elements ---
const canvas = document.getElementById('shapeCanvas');
const ctx = canvas.getContext('2d');
const questionArea = document.getElementById('questionArea');
const timerArea = document.getElementById('timerArea');
const feedbackArea = document.getElementById('feedbackArea');
const nextButton = document.getElementById('nextButton');

// --- Game Constants ---
const SHAPE_TYPES = ['正方形', '長方形', '平行四邊形', '菱形', '梯形'];
const VERTEX_LABELS = ['A', 'B', 'C', 'D'];
const COUNTDOWN_SECONDS = 5;
const SIDE_CLICK_TOLERANCE = 15;
const LABEL_OFFSET = 20; // 稍微增加字母標籤與頂點的距離
const SHAPE_LINE_COLOR = "#007BFF";
const SHAPE_LINE_WIDTH = 3;
const LABEL_FONT = "bold 18px Arial";
const LABEL_COLOR = "#800080"; // 紫色

// --- Game State ---
let currentShape = null;
let currentQuestion = null;
let timerInterval = null;
let timeLeft = COUNTDOWN_SECONDS;
let canClick = false;

// --- Shape Drawing and Generation ---
function clearCanvas() {
    console.log("[Debug] Clearing canvas");
    if (!ctx) { console.error("ctx is null in clearCanvas"); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 繪製單個四邊形及其頂點標籤
function drawShape(shape) {
    console.log("[Debug] drawShape called with shape:", JSON.stringify(shape));
    if (!shape || !shape.vertices || shape.vertices.length !== 4) {
        console.error("[Debug] Invalid shape data in drawShape:", shape);
        feedbackArea.textContent = "圖形數據錯誤！"; // 在畫面上也給提示
        feedbackArea.className = "feedback-incorrect";
        return; // 如果圖形數據有問題，則不進行繪製
    }
    clearCanvas();
    try {
        ctx.beginPath();
        ctx.moveTo(shape.vertices[0].x, shape.vertices[0].y);
        for (let i = 1; i < shape.vertices.length; i++) {
            if (shape.vertices[i] && typeof shape.vertices[i].x === 'number' && typeof shape.vertices[i].y === 'number') {
                ctx.lineTo(shape.vertices[i].x, shape.vertices[i].y);
            } else {
                console.error(`[Debug] Invalid vertex data at index ${i}:`, shape.vertices[i]);
                throw new Error(`Invalid vertex at index ${i}`);
            }
        }
        ctx.closePath();
        ctx.strokeStyle = SHAPE_LINE_COLOR;
        ctx.lineWidth = SHAPE_LINE_WIDTH;
        ctx.stroke();
        console.log("[Debug] Shape outline drawn.");

        // 在 Canvas 上繪製頂點標籤
        ctx.font = LABEL_FONT;
        ctx.fillStyle = LABEL_COLOR;

        let shapeCenterX = 0; let shapeCenterY = 0;
        for (const v of shape.vertices) { shapeCenterX += v.x; shapeCenterY += v.y; }
        shapeCenterX /= shape.vertices.length;
        shapeCenterY /= shape.vertices.length;

        shape.vertices.forEach((vertex, i) => {
            let labelX = vertex.x; let labelY = vertex.y; const text = VERTEX_LABELS[i];
            let textAlign = 'center'; let textBaseline = 'middle';

            const dx = vertex.x - shapeCenterX;
            const dy = vertex.y - shapeCenterY;
            const distFromShapeCenter = Math.sqrt(dx * dx + dy * dy);

            if (distFromShapeCenter > 1) {
                labelX += (dx / distFromShapeCenter) * LABEL_OFFSET;
                labelY += (dy / distFromShapeCenter) * LABEL_OFFSET;
            } else { // 備用偏移
                if (vertex.x < canvas.width / 2) labelX -= LABEL_OFFSET; else labelX += LABEL_OFFSET;
                if (vertex.y < canvas.height / 2) labelY -= LABEL_OFFSET; else labelY += LABEL_OFFSET;
            }

            // 微調對齊使標籤更美觀
            if (dx > LABEL_OFFSET * 0.5) textAlign = 'left';   // 點在圖形右側，文字左對齊
            else if (dx < -LABEL_OFFSET * 0.5) textAlign = 'right'; // 點在圖形左側，文字右對齊
            else textAlign = 'center';

            if (dy > LABEL_OFFSET * 0.5) textBaseline = 'top';    // 點在圖形下方，文字頂部對齊
            else if (dy < -LABEL_OFFSET * 0.5) textBaseline = 'bottom';// 點在圖形上方，文字底部對齊
            else textBaseline = 'middle';

            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            ctx.fillText(text, labelX, labelY);
        });
        console.log("[Debug] Vertex labels drawn.");
    } catch (e) {
        console.error("[Debug] Error in drawShape:", e, "Shape data:", JSON.stringify(shape));
        ctx.fillStyle = 'red'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
        ctx.fillText('繪製圖形時出錯 (drawShape)', canvas.width / 2, canvas.height / 2);
    }
}


// 產生隨機四邊形的頂點座標 (保持 V6 讓圖形更大的邏輯)
function generateQuadrilateral() {
    console.log("[Debug] generateQuadrilateral called");
    const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    let vertices = [];
    const w = canvas.width; const h = canvas.height; const padding = 30;
    const minSizeBase = Math.min(w, h) * 0.4; // 嘗試再增大一些基礎尺寸
    const maxSizeBase = Math.min(w, h) - 2 * padding;
    let size, size2, height, offsetX, startX, startY, sideLength;

    // 讓起始點更分散，但確保圖形有空間
    startX = padding + Math.random() * (w * 0.2); // 限制在左側20%範圍內隨機
    startY = padding + Math.random() * (h * 0.2); // 限制在頂部20%範圍內隨機
    console.log(`[Debug] Generating type: ${type}, initial start: (${startX.toFixed(1)}, ${startY.toFixed(1)})`);

    try {
        switch (type) {
            case '正方形':
                size = minSizeBase + Math.random() * (maxSizeBase * 0.6 - minSizeBase); // 調整比例
                size = Math.min(size, w - startX - padding, h - startY - padding);
                if (size < minSizeBase * 0.6) { console.warn("Square too small, using minSizeBase"); size = minSizeBase * 0.6; }
                vertices = [ { x: startX, y: startY }, { x: startX + size, y: startY }, { x: startX + size, y: startY + size }, { x: startX, y: startY + size }];
                break;
            case '長方形':
                size = minSizeBase + Math.random() * (maxSizeBase * 0.7 - minSizeBase);
                size2 = minSizeBase + Math.random() * (maxSizeBase * 0.6 - minSizeBase);
                if (Math.abs(size - size2) < 30 && size > 40) size2 = size - 30; else if (Math.abs(size - size2) < 30) size2 = size + 30;
                size = Math.min(size, w - startX - padding); size2 = Math.min(size2, h - startY - padding);
                if (size < minSizeBase * 0.5 || size2 < minSizeBase * 0.5) { console.warn("Rectangle too small, using minSizeBase aspects"); size = Math.max(size, minSizeBase*0.5); size2 = Math.max(size2, minSizeBase*0.5); }
                vertices = [ { x: startX, y: startY }, { x: startX + size, y: startY }, { x: startX + size, y: startY + size2 }, { x: startX, y: startY + size2 }];
                break;
            case '平行四邊形':
                size = minSizeBase + Math.random() * (maxSizeBase * 0.7 - minSizeBase);
                height = minSizeBase * 0.7 + Math.random() * (maxSizeBase * 0.5 - minSizeBase * 0.7);
                offsetX = (minSizeBase * 0.15) + Math.random() * (size * 0.25); // 調整偏移範圍
                offsetX = Math.min(offsetX, w - startX - size - padding -10); // 確保 offsetX 不會太大
                size = Math.min(size, w - startX - offsetX - padding); height = Math.min(height, h - startY - padding);
                if (size < minSizeBase * 0.6 || height < minSizeBase * 0.6) { console.warn("Parallelogram too small, using minSizeBase aspects"); size = Math.max(size, minSizeBase*0.6); height = Math.max(height, minSizeBase*0.6); }
                vertices = [ { x: startX, y: startY }, { x: startX + size, y: startY }, { x: startX + size + offsetX, y: startY + height }, { x: startX + offsetX, y: startY + height }];
                break;
            case '菱形':
                sideLength = minSizeBase * 0.7 + Math.random() * (maxSizeBase * 0.4 - minSizeBase * 0.7);
                const angleRad = (Math.PI / 4) + Math.random() * (Math.PI / 6); // 45-75 度，避免太扁或太尖
                const xOffsetRhombus = sideLength * Math.cos(angleRad); const yOffsetRhombus = sideLength * Math.sin(angleRad);
                // 嘗試將菱形放在畫布中央
                const rStartX = (w - (sideLength + xOffsetRhombus)) / 2;
                const rStartY = (h - yOffsetRhombus) / 2;

                if(rStartX < padding || rStartY < padding || rStartX + sideLength + xOffsetRhombus > w - padding || rStartY + yOffsetRhombus > h-padding){
                    console.warn("Rhombus calculated out of preferred bounds, using fallback.");
                    return generateQuadrilateralOfType('正方形');
                }
                vertices = [
                    { x: rStartX + xOffsetRhombus, y: rStartY },
                    { x: rStartX + xOffsetRhombus + sideLength, y: rStartY },
                    { x: rStartX + sideLength, y: rStartY + yOffsetRhombus },
                    { x: rStartX, y: rStartY + yOffsetRhombus }
                ];
                break;
            case '梯形': // 等腰梯形
                let topBase = minSizeBase * 0.5 + Math.random() * (maxSizeBase * 0.3 - minSizeBase * 0.5);
                let bottomBase = topBase + (minSizeBase * 0.2) + Math.random() * (maxSizeBase * 0.4);
                height = minSizeBase * 0.6 + Math.random() * (maxSizeBase * 0.5 - minSizeBase * 0.6);
                // 確保 bottomBase > topBase
                if (bottomBase <= topBase) bottomBase = topBase + Math.max(30, minSizeBase * 0.2);

                const trapStartX = (w - bottomBase) / 2; // 嘗試居中底邊
                const trapStartY = (h - height) / 2 - padding; // 嘗試居中垂直高度

                offsetX = (bottomBase - topBase) / 2;
                // 邊界檢查
                if (trapStartX < padding || trapStartX + bottomBase > w - padding || trapStartY < padding || trapStartY + height > h - padding) {
                     console.warn("Trapezoid calculated out of preferred bounds, using fallback.");
                     return generateQuadrilateralOfType('正方形');
                }
                vertices = [ { x: trapStartX + offsetX, y: trapStartY }, { x: trapStartX + offsetX + topBase, y: trapStartY }, { x: trapStartX + bottomBase, y: trapStartY + height }, { x: trapStartX, y: trapStartY + height }];
                break;
            default: return generateQuadrilateralOfType('正方形');
        }
        if (!vertices || vertices.length !== 4 || vertices.some(v => isNaN(v.x) || isNaN(v.y))) {
            console.error("Invalid vertices generated for type:", type, "Vertices:", JSON.stringify(vertices));
            return generateQuadrilateralOfType('正方形');
        }
        console.log(`[Debug] Generated vertices for ${type}:`, JSON.stringify(vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)}))));
        return { type: type, vertices: vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)})) };
    } catch (error) {
        console.error(`[Debug] Error in generateQuadrilateral for type ${type}:`, error);
        return generateQuadrilateralOfType('正方形'); // 出錯時返回一個安全的圖形
    }
}

function generateQuadrilateralOfType(type) {
    console.log(`[Debug] generateQuadrilateralOfType called for: ${type} (fallback)`);
    const w = canvas.width; const h = canvas.height; const padding = 30;
    const minSize = Math.min(w, h) * 0.4; // 備用圖形的最小尺寸
    const size = minSize + Math.random() * (Math.min(w,h) * 0.3); // 尺寸在 40% 到 70% 之間
    const startX = padding + Math.random() * (w - size - 2 * padding);
    const startY = padding + Math.random() * (h - size - 2 * padding);
    const finalSize = Math.min(size, w - startX - padding, h - startY - padding); // 確保不超出
    const vertices = [ { x: startX, y: startY }, { x: startX + finalSize, y: startY }, { x: startX + finalSize, y: startY + finalSize }, { x: startX, y: startY + finalSize }];
    console.log(`[Debug] Fallback square generated:`, JSON.stringify(vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)}))));
    return { type: '正方形', vertices: vertices.map(v => ({x: Math.round(v.x), y: Math.round(v.y)})) };
}

// --- Game Logic ---
function generateNewQuestion() {
    console.log("[Debug] generateNewQuestion called");
    if (!questionArea || !feedbackArea || !timerArea || !canvas || !ctx) { console.error("UI or canvas elements missing!"); return; }
    try {
        currentShape = generateQuadrilateral();
        if (!currentShape || !currentShape.vertices || currentShape.vertices.length !== 4 || currentShape.vertices.some(v => typeof v.x !== 'number' || typeof v.y !== 'number')) {
            console.error("[Debug] Failed to get valid shape. generateQuadrilateral returned:", JSON.stringify(currentShape));
            feedbackArea.textContent = "哎呀，圖形生成出錯了！請按「下一題」試試。";
            feedbackArea.className = "feedback-incorrect";
            if(timerInterval) clearInterval(timerInterval); timerArea.textContent = "錯誤"; canClick = false;
            return;
        }
        console.log("[Debug] Shape generated, calling drawShape...");
        drawShape(currentShape); // 調用更新後的 drawShape
        console.log("[Debug] drawShape finished.");

        const sideIndex = Math.floor(Math.random() * 4);
        const v1Index = sideIndex; const v2Index = (sideIndex + 1) % 4;
        const sideName = VERTEX_LABELS[v1Index] + VERTEX_LABELS[v2Index];
        currentQuestion = {
            sideName: sideName,
            p1: currentShape.vertices[v1Index], p2: currentShape.vertices[v2Index],
            indices: [v1Index, v2Index]
        };
        console.log(`[Debug] New question: ${sideName}`);
        questionArea.textContent = `小朋友，請點出 線段 ${sideName} 在哪裡？`; // 更友好的提示
        feedbackArea.textContent = ""; feedbackArea.className = "";
        canClick = true;
        startTimer();
    } catch (e) {
        console.error("[Debug] Error in generateNewQuestion:", e);
        feedbackArea.textContent = "出題時發生錯誤！";
        feedbackArea.className = "feedback-incorrect";
    }
}

// --- 其他函數 (startTimer, click listener, handleAnswer, highlightSide, distToSegment, initializeGame) ---
// 保持 V6 版本的邏輯，但請確保它們與新的 drawShape 兼容
// 並且所有對 DOM 元素的引用都有效

function startTimer() {
    console.log("[Debug] startTimer called");
    timeLeft = COUNTDOWN_SECONDS;
    timerArea.textContent = `⏳ ${timeLeft}`;
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerArea.textContent = `⏳ ${timeLeft}`;
        if (timeLeft <= 0) {
            if(timerInterval) clearInterval(timerInterval);
            canClick = false;
            handleAnswer(null); // 時間到
        }
    }, 1000);
}

canvas.addEventListener('click', (event) => {
    console.log("[Debug] Canvas clicked");
    if (!canClick || !currentShape || !currentShape.vertices) {
        console.log(`[Debug] Click ignored: canClick=${canClick}, currentShape valid=${!!(currentShape && currentShape.vertices)}`);
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    console.log(`[Debug] Click at: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`);
    let clickedSide = null;

    for (let i = 0; i < currentShape.vertices.length; i++) {
        const p1 = currentShape.vertices[i];
        const p2 = currentShape.vertices[(i + 1) % 4];
        if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p1.y !== 'number' || typeof p2.x !== 'number' || typeof p2.y !== 'number') {
             console.error("Invalid vertex in click detection, i:", i, p1, p2); continue;
        }
        const d = distToSegment(clickX, clickY, p1.x, p1.y, p2.x, p2.y);
        // console.log(`[Debug] Dist to side ${VERTEX_LABELS[i]}${VERTEX_LABELS[(i+1)%4]}: ${d.toFixed(1)}`);
        if (d < SIDE_CLICK_TOLERANCE) {
            clickedSide = { p1: p1, p2: p2, indices: [i, (i + 1) % 4], name: VERTEX_LABELS[i] + VERTEX_LABELS[(i + 1) % 4] };
            console.log("[Debug] Clicked side:", clickedSide.name);
            break;
        }
    }
    handleAnswer(clickedSide);
});

function handleAnswer(clickedSideData) {
    console.log("[Debug] handleAnswer called. Clicked:", JSON.stringify(clickedSideData), "Target:", currentQuestion ? currentQuestion.sideName : "N/A");
    canClick = false;
    if(timerInterval) clearInterval(timerInterval);

    if (clickedSideData) { // 如果確實點擊了某個可識別的邊
        highlightSide(clickedSideData.p1, clickedSideData.p2, "orange", 5);
    }

    setTimeout(() => {
        if (!currentQuestion || !currentQuestion.p1 || !currentQuestion.p2) {
            console.error("currentQuestion is invalid in handleAnswer timeout");
            feedbackArea.textContent = "發生內部錯誤，請按下一題。";
            feedbackArea.className = "feedback-incorrect";
            return;
        }
        highlightSide(currentQuestion.p1, currentQuestion.p2, "#32CD32", 5); // 用綠色高亮正確答案

        if (clickedSideData &&
            ((clickedSideData.indices[0] === currentQuestion.indices[0] && clickedSideData.indices[1] === currentQuestion.indices[1]) ||
             (clickedSideData.indices[0] === currentQuestion.indices[1] && clickedSideData.indices[1] === currentQuestion.indices[0]))
           ) {
            feedbackArea.textContent = `🎉 太棒了！你答對了！線段 ${currentQuestion.sideName} 被你找到了！👍`;
            feedbackArea.className = "feedback-correct";
        } else if (timeLeft <= 0 && !clickedSideData) { // 時間到且沒有點擊
            feedbackArea.textContent = `⏱️ 時間到囉！線段 ${currentQuestion.sideName} 在那裡。下次要快一點喔！`;
            feedbackArea.className = "feedback-encourage";
        } else { // 答錯或點了空白處
            let message = `😅 哎呀，差一點點！正確答案是線段 ${currentQuestion.sideName}。`;
            if (clickedSideData) {
                message += ` 你點的是線段 ${clickedSideData.name} 附近。`;
            } else {
                message += ` 你好像沒有點到邊上哦。`;
            }
            message += " 沒關係，繼續加油！💪";
            feedbackArea.textContent = message;
            feedbackArea.className = "feedback-incorrect";
        }
    }, clickedSideData ? 500 : 100); // 如果有點擊，延遲長一點看效果；否則快一點顯示答案
}

function highlightSide(p1, p2, color, lineWidth) {
    if(!p1 || !p2 || !ctx) { console.warn("Cannot highlight side, missing data or context."); return; }
    // console.log(`[Debug] Highlighting side between (${p1.x},${p1.y}) and (${p2.x},${p2.y}) with ${color}`);
    try {
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
        // 不立即恢復，讓高亮保持直到下次重繪
    } catch (e) {
        console.error("Error in highlightSide:", e);
    }
}
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x1 - x2)**2 + (y1 - y2)**2;
  if (l2 === 0) return Math.sqrt((px - x1)**2 + (py - y1)**2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1); const projY = y1 + t * (y2 - y1);
  return Math.sqrt((px - projX)**2 + (py - projY)**2);
}

if(nextButton) {
    nextButton.addEventListener('click', () => {
        console.log("[Debug] Next button clicked.");
        generateNewQuestion();
    });
} else {
    console.error("Next button not found!");
}

// --- Initialization ---
function initializeGame() {
    console.log("[Debug] initializeGame called");
    if (!canvas || !ctx || !nextButton || !questionArea || !timerArea || !feedbackArea) {
        console.error("One or more critical DOM elements not found during init!");
        alert("錯誤：頁面元素不完整，遊戲無法啟動。請檢查HTML ID。");
        document.body.innerHTML = "<h1 style='color:red;'>遊戲初始化失敗，請檢查控制台！</h1>";
        return;
    }
    // 確保 canvas 尺寸在 JS 中設定，與 HTML 屬性一致或覆蓋
    canvas.width = 400;
    canvas.height = 300;
    console.log("[Debug] Canvas size set.");

    generateNewQuestion(); // 產生第一個問題
    console.log("[Debug] First question should be generated.");
}

// 延遲執行，確保 DOM 完全載入
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame(); // DOM is already loaded
}