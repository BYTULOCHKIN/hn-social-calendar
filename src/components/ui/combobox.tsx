import React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type ComboboxOption = {
    value: string;
    label: string;
};

type ComboboxProps = {
    value: string;
    options: ComboboxOption[];
    onValueChange: (_value: string) => void;
    'aria-label': string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
};

const Combobox = ({
    value,
    options,
    onValueChange,
    'aria-label': ariaLabel,
    placeholder = 'Оберіть значення',
    searchPlaceholder = 'Пошук…',
    emptyText = 'Нічого не знайдено',
    className,
}: ComboboxProps) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);
    const selected = options.find((option) => {
        return option.value === value;
    });
    const normalizedSearch = search.trim().toLocaleLowerCase('uk-UA');
    const filteredOptions = options.filter((option) => {
        return option.label.toLocaleLowerCase('uk-UA').includes(normalizedSearch);
    });

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-label={ariaLabel}
                    aria-expanded={open}
                    className={cn(
                        'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        className
                    )}
                >
                    <span className={cn('truncate', !selected && 'text-muted-foreground')}>
                        {selected?.label ?? placeholder}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    inputRef.current?.focus();
                }}
            >
                <div className="flex items-center gap-2 border-b border-border px-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="search"
                        value={search}
                        onChange={(event) => {
                            return setSearch(event.target.value);
                        }}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className="h-11 border-0 px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                    />
                </div>
                <div role="listbox" aria-label={ariaLabel} className="max-h-60 overflow-y-auto p-1">
                    {filteredOptions.length ? (
                        filteredOptions.map((option) => {
                            const active = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-foreground outline-none hover:bg-accent focus-visible:bg-accent"
                                    onClick={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('size-4 shrink-0 text-primary', !active && 'opacity-0')} />
                                    <span className="truncate">{option.label}</span>
                                </button>
                            );
                        })
                    ) : (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export { Combobox };
export type { ComboboxOption };
