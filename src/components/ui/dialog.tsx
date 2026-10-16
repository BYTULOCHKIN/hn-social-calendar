import type React from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

const DialogTrigger = (props: React.ComponentProps<typeof DialogPrimitive.Trigger>) => {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

const DialogPortal = (props: React.ComponentProps<typeof DialogPrimitive.Portal>) => {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

const DialogClose = (props: React.ComponentProps<typeof DialogPrimitive.Close>) => {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
};

const DialogOverlay = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) => {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                className
            )}
            {...props}
        />
    );
};

const DialogContent = ({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) => {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg',
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                        <XIcon />
                        <span className="sr-only">Закрити</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
};

const DialogHeader = ({ className, ...props }: React.ComponentProps<'div'>) => {
    return <div data-slot="dialog-header" className={cn('flex flex-col gap-2 text-left', className)} {...props} />;
};

const DialogFooter = ({ className, ...props }: React.ComponentProps<'div'>) => {
    return (
        <div
            data-slot="dialog-footer"
            className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    );
};

const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn('text-lg leading-none font-semibold', className)}
            {...props}
        />
    );
};

const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
};

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
