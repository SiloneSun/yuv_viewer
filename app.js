class YUVViewerApp {
    constructor() {
        this.decoder = new YUVDecoder();
        this.fileBuffer = null;
        this.fileName = '';
        this.totalFrames = 0;
        this.currentFrame = 0;
        
        this.initElements();
        this.bindEvents();
        this.updateStatus('就绪');
    }

    initElements() {
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.widthInput = document.getElementById('width');
        this.heightInput = document.getElementById('height');
        this.yuvFormatSelect = document.getElementById('yuvFormat');
        this.bitDepthSelect = document.getElementById('bitDepth');
        this.fileSizeDisplay = document.getElementById('fileSize');
        this.expectedSizeDisplay = document.getElementById('expectedSize');
        this.frameCountDisplay = document.getElementById('frameCount');
        this.currentFrameInput = document.getElementById('currentFrame');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.renderBtn = document.getElementById('renderBtn');
        this.rotateLeftBtn = document.getElementById('rotateLeftBtn');
        this.rotateRightBtn = document.getElementById('rotateRightBtn');
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.canvas = document.getElementById('yuvCanvas');
        this.placeholder = document.getElementById('placeholder');
        this.statusBar = document.getElementById('statusBar');
        this.ctx = this.canvas.getContext('2d');
        
        this.rotation = 0;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.widthInput.addEventListener('input', () => this.calculateFrames());
        this.heightInput.addEventListener('input', () => this.calculateFrames());
        this.yuvFormatSelect.addEventListener('change', () => this.calculateFrames());
        this.bitDepthSelect.addEventListener('change', () => this.calculateFrames());
        this.currentFrameInput.addEventListener('change', () => {
            this.currentFrame = parseInt(this.currentFrameInput.value) || 0;
            this.render();
        });
        this.prevBtn.addEventListener('click', () => {
            if (this.currentFrame > 0) {
                this.currentFrame--;
                this.currentFrameInput.value = this.currentFrame;
                this.render();
            }
        });
        this.nextBtn.addEventListener('click', () => {
            if (this.currentFrame < this.totalFrames - 1) {
                this.currentFrame++;
                this.currentFrameInput.value = this.currentFrame;
                this.render();
            }
        });
        this.renderBtn.addEventListener('click', () => this.render());
        
        this.rotateLeftBtn.addEventListener('click', () => {
            this.rotation -= 90;
            this.updateTransform();
        });
        this.rotateRightBtn.addEventListener('click', () => {
            this.rotation += 90;
            this.updateTransform();
        });
        this.zoomInBtn.addEventListener('click', () => {
            this.scale = Math.min(this.scale * 1.25, 8);
            this.updateTransform();
        });
        this.zoomOutBtn.addEventListener('click', () => {
            this.scale = Math.max(this.scale * 0.8, 0.125);
            this.updateTransform();
        });
        this.resetBtn.addEventListener('click', () => {
            this.rotation = 0;
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.updateTransform();
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale = Math.max(0.125, Math.min(8, this.scale * delta));
            this.updateTransform();
        });
        
        let isDragging = false;
        let lastX, lastY;
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.offsetX += e.clientX - lastX;
                this.offsetY += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                this.updateTransform();
            }
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    updateTransform() {
        this.canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) rotate(${this.rotation}deg) scale(${this.scale})`;
        this.updateStatus(`旋转: ${this.rotation}° | 缩放: ${(this.scale * 100).toFixed(0)}%`);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.fileName = file.name;
        this.fileInfo.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileBuffer = new Uint8Array(e.target.result);
            this.fileSizeDisplay.textContent = this.formatBytes(this.fileBuffer.length);
            this.calculateFrames();
            this.updateStatus(`文件已加载: ${file.name}`);
        };
        reader.readAsArrayBuffer(file);
    }

    calculateFrames() {
        if (!this.fileBuffer) return;

        const width = parseInt(this.widthInput.value) || 0;
        const height = parseInt(this.heightInput.value) || 0;
        const format = this.yuvFormatSelect.value;
        const bitDepth = parseInt(this.bitDepthSelect.value);

        if (width <= 0 || height <= 0) {
            this.expectedSizeDisplay.textContent = '-';
            this.frameCountDisplay.textContent = '-';
            return;
        }

        const frameSize = this.decoder.getFrameSize(width, height, format, bitDepth);
        this.expectedSizeDisplay.textContent = this.formatBytes(frameSize);
        
        this.totalFrames = Math.floor(this.fileBuffer.length / frameSize);
        this.frameCountDisplay.textContent = this.totalFrames.toString();
        this.currentFrameInput.max = this.totalFrames - 1;
    }

    render() {
        if (!this.fileBuffer) {
            this.updateStatus('请先选择YUV文件');
            return;
        }

        const width = parseInt(this.widthInput.value) || 0;
        const height = parseInt(this.heightInput.value) || 0;
        const format = this.yuvFormatSelect.value;
        const bitDepth = parseInt(this.bitDepthSelect.value);

        if (width <= 0 || height <= 0) {
            this.updateStatus('请输入有效的宽度和高度');
            return;
        }

        const frameSize = this.decoder.getFrameSize(width, height, format, bitDepth);
        const offset = this.currentFrame * frameSize;

        if (offset + frameSize > this.fileBuffer.length) {
            this.updateStatus('帧数据超出文件范围');
            return;
        }

        const frameBuffer = this.fileBuffer.slice(offset, offset + frameSize);

        try {
            this.updateStatus('正在解码...');
            
            const startTime = performance.now();
            const imageDataArray = this.decoder.decode(frameBuffer, width, height, format, bitDepth);
            const decodeTime = performance.now() - startTime;

            this.canvas.width = width;
            this.canvas.height = height;
            
            const imageData = this.ctx.createImageData(width, height);
            imageData.data.set(imageDataArray);
            
            this.ctx.putImageData(imageData, 0, 0);
            
            this.placeholder.style.display = 'none';
            this.canvas.style.display = 'block';
            
            this.rotation = 0;
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.canvas.style.transform = 'none';
            
            this.updateStatus(`渲染完成 - 帧 ${this.currentFrame + 1}/${this.totalFrames}, 解码耗时: ${decodeTime.toFixed(1)}ms`);
        } catch (error) {
            this.updateStatus(`解码错误: ${error.message}`);
            console.error(error);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateStatus(message) {
        this.statusBar.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.yuvViewer = new YUVViewerApp();
});