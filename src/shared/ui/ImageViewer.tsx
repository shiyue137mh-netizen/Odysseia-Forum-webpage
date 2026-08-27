import { AnimatePresence, motion } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useImageViewerStore } from '../store/useImageViewerStore';
import { createPortal } from 'react-dom';

export function ImageViewer() {
  const { isOpen, src, alt, close } = useImageViewerStore();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 监听开启状态，同步原生 dialog 状态
  useEffect(() => {
    if (isOpen) {
      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (dialogRef.current && dialogRef.current.open) {
        dialogRef.current.close();
      }
      document.body.style.overflow = '';
      handleReset(); // 关闭时重置状态
    }
  }, [isOpen]);

  // 监听 ESC 键关闭（dialog 默认有此行为，但我们需要同步 Zustand 状态）
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      close();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [close]);

  const handleReset = () => {
    setScale(1);
    setRotate(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    link.click();
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="image-viewer-title"
          className="fixed inset-0 z-10000 m-0 h-screen w-screen max-h-none max-w-none border-none bg-black/90 p-0 backdrop-blur-sm backdrop:bg-black/90 backdrop:backdrop-blur-sm outline-hidden"
          onClick={(e) => {
            if (e.target === dialogRef.current) close();
          }}
        >
          <div 
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onClick={(e) => {
              // 如果点击的是容器本身（即图片之外的空白区域），则关闭
              if (e.target === e.currentTarget) close();
            }}
          >
            {/* 顶部工具栏 */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-linear-to-b from-black/50 to-transparent"
            >
              <div id="image-viewer-title" className="text-white/80 text-sm font-medium truncate max-w-[50%] ml-4">
                {alt || '查看图片'}
              </div>
              <div className="flex items-center gap-2 mr-4">
                <button 
                  onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="放大"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="缩小"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setRotate(prev => prev + 90)}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="旋转"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleReset}
                  className="text-xs px-3 py-1.5 rounded-full hover:bg-white/10 text-white transition-colors border border-white/20"
                >
                  重置
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button 
                  onClick={handleDownload}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="下载"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button 
                  onClick={close}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all ml-2"
                  title="关闭"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </motion.div>

            {/* 图片主体 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { type: 'spring', damping: 25, stiffness: 300 }
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-15 max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            >
              <motion.img
                src={src}
                alt={alt}
                animate={{ scale, rotate }}
                transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm pointer-events-none select-none"
                onDoubleClick={handleReset}
              />
            </motion.div>

            {/* 底部操作提示 */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs"
            >
              双击重置 · 使用 ESC 关闭
            </motion.div>
          </div>
        </dialog>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
