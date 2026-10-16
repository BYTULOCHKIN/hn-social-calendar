import type React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
    return <PopoverPrimitive.Root data-slot="popover" {...props} />;
};

const PopoverTrigger = (props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
};

const PopoverContent = ({
    className,
    align = 'center',
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) => {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                align={align}
                sideOffset={sideOffset}
                className={cn(
                    'z-[70] w-72 rounded-md border border-border bg-background p-4 text-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                    className
                )}
                {...props}
            />
        </PopoverPrimitive.Portal>
    );
};

export { Popover, PopoverContent, PopoverTrigger };
