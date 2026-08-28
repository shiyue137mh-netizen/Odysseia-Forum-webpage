import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Image as ImageIcon, Hash, Eye } from 'lucide-react';
import { bannerApi } from '@/features/banner/api/bannerApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showMascotToast } from '@/features/mascot/lib/mascotToast';
import { notifySuccess } from '@/features/mascot/lib/notify';
import { extractErrorMessage } from '@/shared/lib/notify';
import { useChannels } from '@/shared/hooks/useChannels';
import type { Thread } from '@/entities/thread/types';

const bannerSchema = z.object({
    thread_link: z.string().trim().min(17, '请输入帖子 ID 或 Discord 帖子链接').max(150, '帖子链接过长'),
    cover_image_url: z.string().trim().refine(
        (value) => value === '' || z.string().url().safeParse(value).success,
        '请输入有效的图片链接',
    ),
    target_scope: z.string().min(1, '请选择展示范围'),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialThread?: Pick<Thread, 'thread_id' | 'title'>;
}

export function BannerApplicationModal({ isOpen, onClose, initialThread }: BannerApplicationModalProps) {
    const { user } = useAuth();
    const channelsQuery = useChannels();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<BannerFormValues>({
        resolver: zodResolver(bannerSchema),
        defaultValues: {
            thread_link: initialThread?.thread_id ?? '',
            cover_image_url: '',
            target_scope: 'global',
        },
    });

    const onSubmit = async (data: BannerFormValues) => {
        if (!user) {
            showMascotToast({
                id: 'banner-login-required',
                emotion: 'confused',
                eyebrow: 'Identity Check',
                title: '还没拿到你的身份牌',
                message: '要先登录，类脑娘才能帮你把 Banner 申请送到审核台。',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await bannerApi.apply({
                ...data,
                cover_image_url: data.cover_image_url || undefined,
            });
            if (result.success) {
                notifySuccess('Banner 申请已提交，请等待审核');
                reset();
                onClose();
            } else {
                showMascotToast({
                    id: 'banner-apply-failed',
                    emotion: 'sad_apology',
                    eyebrow: 'Application Blocked',
                    title: '这份 Banner 申请没送进去',
                    message: result.message || '申请提交失败，稍后整理好信息再试一次。',
                });
            }
        } catch (error) {
            showMascotToast({
                id: 'banner-apply-error',
                emotion: 'error',
                eyebrow: 'Submission Error',
                title: '审核通道刚刚抖了一下',
                message: extractErrorMessage(error, '申请提交失败，请稍后重试'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        reset({
            thread_link: initialThread?.thread_id ?? '',
            cover_image_url: '',
            target_scope: 'global',
        });
        const dialog = dialogRef.current;
        if (!dialog || dialog.open) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }, [initialThread?.thread_id, isOpen, reset]);

    if (!isOpen) return null;

    return createPortal(
        <dialog
            ref={dialogRef}
            aria-labelledby="banner-application-title"
            className="fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/50 p-4 text-(--od-text-primary) backdrop:bg-transparent backdrop-blur-xs animate-in fade-in duration-200"
            onCancel={(event) => {
                event.preventDefault();
                if (!isSubmitting) onClose();
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div
                className="od-floating-panel-solid w-full max-w-md overflow-hidden rounded-xl border border-(--od-border) shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-(--od-border) bg-(--od-bg-secondary) px-6 py-4">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-(--od-accent)" />
                        <h2 id="banner-application-title" className="text-lg font-bold text-(--od-text-primary)">申请 Banner 展示位</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-(--od-text-tertiary) hover:bg-(--od-bg-tertiary) hover:text-(--od-text-primary) transition-colors"
                        aria-label="关闭 Banner 申请"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6 rounded-lg bg-(--od-bg-secondary)/50 p-3 text-sm text-(--od-text-secondary) border border-(--od-border)">
                        <p className="flex items-center gap-2">
                            <span className="text-(--od-accent)">ℹ️</span>
                            申请前请先阅读
                            <a
                                href="https://discord.com/channels/1134557553011998840/1307242450300964986/1442755349311651901"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-(--od-link) hover:underline"
                            >
                                《Banner展示位申请规定》
                            </a>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Thread ID */}
                        {initialThread ? (
                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-sm font-medium text-(--od-text-secondary)">
                                    <Hash className="h-4 w-4" />
                                    申请作品
                                </p>
                                <div className="rounded-lg bg-(--od-bg-secondary) px-3 py-2.5">
                                    <p className="line-clamp-2 text-sm font-semibold text-(--od-text-primary)">
                                        {initialThread.title}
                                    </p>
                                    <p className="mt-1 truncate font-mono text-[11px] text-(--od-text-tertiary)">
                                        {initialThread.thread_id}
                                    </p>
                                </div>
                                <input type="hidden" {...register('thread_link')} />
                                {errors.thread_link && (
                                    <p className="text-xs text-(--od-error)">{errors.thread_link.message}</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="banner-thread-link" className="flex items-center gap-2 text-sm font-medium text-(--od-text-secondary)">
                                    <Hash className="h-4 w-4" />
                                    帖子 ID 或链接 <span className="text-(--od-error)">*</span>
                                </label>
                                <input
                                    id="banner-thread-link"
                                    {...register('thread_link')}
                                    placeholder="纯数字 ID 或 Discord 帖子链接"
                                    className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) placeholder:text-(--od-text-tertiary) focus:border-(--od-accent) focus:outline-hidden focus:ring-1 focus:ring-(--od-accent)"
                                />
                                {errors.thread_link && (
                                    <p className="text-xs text-(--od-error)">{errors.thread_link.message}</p>
                                )}
                                <p className="text-xs text-(--od-text-tertiary)">只能为自己的帖子申请 Banner</p>
                            </div>
                        )}

                        {/* Cover Image URL */}
                        <div className="space-y-2">
                            <label htmlFor="banner-cover-image-url" className="flex items-center gap-2 text-sm font-medium text-(--od-text-secondary)">
                                <ImageIcon className="h-4 w-4" />
                                封面图链接（可选）
                            </label>
                            <input
                                id="banner-cover-image-url"
                                {...register('cover_image_url')}
                                placeholder="留空时尝试使用作品首图"
                                className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) placeholder:text-(--od-text-tertiary) focus:border-(--od-accent) focus:outline-hidden focus:ring-1 focus:ring-(--od-accent)"
                            />
                            {errors.cover_image_url && (
                                <p className="text-xs text-(--od-error)">{errors.cover_image_url.message}</p>
                            )}
                            <p className="text-xs text-(--od-text-tertiary)">留空时由后端尝试使用当前作品首图；没有可用图片时会拒绝申请。</p>
                        </div>

                        {/* Target Scope */}
                        <div className="space-y-2">
                            <label htmlFor="banner-target-scope" className="flex items-center gap-2 text-sm font-medium text-(--od-text-secondary)">
                                <Eye className="h-4 w-4" />
                                展示范围 <span className="text-(--od-error)">*</span>
                            </label>
                            <select
                                id="banner-target-scope"
                                {...register('target_scope')}
                                disabled={channelsQuery.isLoading}
                                className="w-full rounded-lg border border-(--od-border) bg-(--od-bg-secondary) px-3 py-2 text-sm text-(--od-text-primary) focus:border-(--od-accent) focus:outline-hidden focus:ring-1 focus:ring-(--od-accent)"
                            >
                                <option value="global">全频道</option>
                                {channelsQuery.data?.source === 'api' && channelsQuery.data.channels.map((channel) => (
                                    <option key={channel.id} value={channel.id}>{channel.name}</option>
                                ))}
                            </select>
                            {errors.target_scope && (
                                <p className="text-xs text-(--od-error)">{errors.target_scope.message}</p>
                            )}
                            <p className="text-xs text-(--od-text-tertiary)">
                                {channelsQuery.isLoading
                                    ? '正在读取可申请频道…'
                                    : channelsQuery.data?.source === 'api'
                                        ? '全频道最多3个，单频道最多5个'
                                        : '频道列表读取失败，目前只能申请全频道展示'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-(--od-border)">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-(--od-text-secondary) hover:bg-(--od-bg-secondary) hover:text-(--od-text-primary) transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-(--od-accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--od-accent-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        提交中...
                                    </>
                                ) : (
                                    <>
                                        提交申请
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </dialog>,
        document.body,
    );
}
