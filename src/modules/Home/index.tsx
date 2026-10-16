import type { CalendarData, SocialGroup, Topic, WorkspaceSubdivision } from '@/domain/calendar';
import React from 'react';
import {
    calculateAnalytics,
    getDaysInMonth,
    isWeekend,
    MONTHS,
    toDateKey,
    TOPIC_META,
    TOPICS,
    weekdayShort,
    YEARS,
} from '@/domain/calendar';
import { Route } from '@/routes/index';
import {
    BarChart3,
    CalendarDays,
    Check,
    ChevronRight,
    CircleHelp,
    ExternalLink,
    LayoutGrid,
    Link2,
    Plus,
    RotateCcw,
    Search,
    Settings,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { calendarApi } from '@/services/calendar/api';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import s from './style.module.css';

type View = 'calendar' | 'analytics' | 'groups' | 'structure' | 'settings';
type CellSelection = { groupId: string; date: string } | null;

const current = new Date();
const initialYear = Math.min(2035, Math.max(2026, current.getFullYear()));
const initialMonth = current.getFullYear() < 2026 ? 1 : current.getMonth() + 1;

const formatSavedTime = (date: Date | null) => {
    if (!date) return 'Усі зміни збережено';
    return `Збережено о ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
};

const GroupDialog = ({
    data,
    group,
    workspace,
    onClose,
    onSave,
}: {
    data: CalendarData;
    group: SocialGroup | null;
    workspace: WorkspaceSubdivision;
    onClose: () => void;
    onSave: (_group: SocialGroup) => Promise<void>;
}) => {
    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const [name, setName] = React.useState(group?.name ?? '');
    const [url, setUrl] = React.useState(group?.url ?? '');
    const [bush, setBush] = React.useState(group?.bush ?? data.bushes[0] ?? '');
    const [employeeId, setEmployeeId] = React.useState(
        group &&
            data.employees.some((item) => {
                return item.id === group.employeeId;
            })
            ? group.employeeId
            : (data.employees[0]?.id ?? '')
    );
    const [busy, setBusy] = React.useState(false);
    const employee = data.employees.find((candidate) => {
        return candidate.id === employeeId;
    });

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
        } catch {
            toast.error('Вкажіть коректне посилання HTTP або HTTPS.');
            return;
        }
        if (!name.trim() || !bush || !employee) {
            toast.error('Заповніть усі обов’язкові поля.');
            return;
        }
        setBusy(true);
        await onSave({
            id: group?.id ?? `new-${crypto.randomUUID()}`,
            name: name.trim(),
            url,
            bush,
            employeeId,
            employeeName: employee.fullName,
            subdivisionId: group?.subdivisionId ?? workspace.id,
            subdivisionName: group?.subdivisionName ?? workspace.name,
            managementName: group?.managementName ?? workspace.managementName,
            position: group?.position ?? data.groups.length + 1,
            active: group?.active ?? true,
        });
        setBusy(false);
    };

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                className={s.dialog}
                showCloseButton={false}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    nameInputRef.current?.focus();
                }}
            >
                <form className={s.dialogForm} onSubmit={submit}>
                    <DialogHeader className={s.dialogHeader}>
                        <div>
                            <span className={s.eyebrow}>Реєстр груп</span>
                            <DialogTitle>{group ? 'Редагувати групу' : 'Нова місцева група'}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Заповніть назву, посилання, кущ і виберіть відповідального працівника.
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className={s.iconButton}
                                aria-label="Закрити"
                            >
                                <X size={18} />
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className={s.dialogBody}>
                        <label className={s.field}>
                            <span>Назва групи</span>
                            <Input
                                ref={nameInputRef}
                                name="groupName"
                                required
                                value={name}
                                onChange={(event) => {
                                    return setName(event.target.value);
                                }}
                                placeholder="Наприклад, Оболонь Live"
                            />
                        </label>
                        <label className={s.field}>
                            <span>Посилання</span>
                            <div className={s.inputWithIcon}>
                                <Link2 size={16} />
                                <Input
                                    type="url"
                                    name="groupUrl"
                                    required
                                    value={url}
                                    onChange={(event) => {
                                        return setUrl(event.target.value);
                                    }}
                                    placeholder="https://t.me/group"
                                />
                            </div>
                        </label>
                        <div className={s.fieldGrid}>
                            <label className={s.field}>
                                <span>Кущ</span>
                                <Select
                                    name="bush"
                                    required
                                    value={bush}
                                    onValueChange={(value) => {
                                        return setBush(value);
                                    }}
                                >
                                    <SelectTrigger aria-label="Кущ">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.bushes.map((item) => {
                                            return (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </label>
                            <div className={s.field}>
                                <span>Відповідальний</span>
                                <Combobox
                                    aria-label="Відповідальний"
                                    value={employeeId}
                                    options={data.employees.map((item) => {
                                        return { value: item.id, label: item.fullName };
                                    })}
                                    onValueChange={setEmployeeId}
                                    placeholder="Оберіть відповідального"
                                    searchPlaceholder="Пошук за ПІБ…"
                                    emptyText="Працівника не знайдено"
                                />
                                <small>У списку {data.employees.length} працівників</small>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className={s.dialogFooter}>
                        {group && (
                            <Button
                                type="button"
                                variant="ghost"
                                className={s.deactivateButton}
                                onClick={() => {
                                    return onSave({ ...group, active: false });
                                }}
                            >
                                Деактивувати
                            </Button>
                        )}
                        <span className={s.dialogSpacer} />
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className={s.secondaryButton}>
                                Скасувати
                            </Button>
                        </DialogClose>
                        <Button type="submit" className={s.primaryButton} disabled={busy}>
                            {busy ? 'Збереження…' : 'Зберегти групу'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const TopicDialog = ({
    selection,
    data,
    onClose,
    onSave,
}: {
    selection: NonNullable<CellSelection>;
    data: CalendarData;
    onClose: () => void;
    onSave: (_topics: Topic[]) => Promise<void>;
}) => {
    const entry = data.entries.find((candidate) => {
        return candidate.groupId === selection.groupId && candidate.date === selection.date;
    });
    const group = data.groups.find((candidate) => {
        return candidate.id === selection.groupId;
    });
    const [selected, setSelected] = React.useState<Topic[]>(entry?.topics ?? []);
    const [busy, setBusy] = React.useState(false);

    const toggle = (topic: Topic) => {
        if (selected.includes(topic))
            setSelected(
                selected.filter((item) => {
                    return item !== topic;
                })
            );
        else if (selected.length < 2) setSelected([...selected, topic]);
        else toast.warning('В одному дні можна вибрати максимум дві тематики.');
    };

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className={`${s.dialog} ${s.topicDialog}`} showCloseButton={false}>
                <DialogHeader className={s.dialogHeader}>
                    <div>
                        <span className={s.eyebrow}>{group?.name}</span>
                        <DialogTitle>
                            {new Date(`${selection.date}T00:00:00`).toLocaleDateString('uk-UA', { dateStyle: 'long' })}
                        </DialogTitle>
                    </div>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className={s.iconButton}
                            aria-label="Закрити"
                        >
                            <X size={18} />
                        </Button>
                    </DialogClose>
                </DialogHeader>
                <div className={s.dialogBody}>
                    <DialogDescription className={s.dialogDescription}>
                        Оберіть до двох тематик. Кожна тематика рахується як окрема публікація.
                    </DialogDescription>
                    <div className={s.topicOptions}>
                        {TOPICS.map((topic) => {
                            const active = selected.includes(topic);
                            return (
                                <Button
                                    key={topic}
                                    type="button"
                                    variant="outline"
                                    className={s.topicOption}
                                    data-active={active}
                                    style={
                                        {
                                            '--topic': TOPIC_META[topic].color,
                                            '--topic-soft': TOPIC_META[topic].soft,
                                        } as React.CSSProperties
                                    }
                                    onClick={() => {
                                        return toggle(topic);
                                    }}
                                >
                                    <span className={s.topicDot} />
                                    {topic}
                                    {active && <Check size={17} />}
                                </Button>
                            );
                        })}
                    </div>
                </div>
                <DialogFooter className={s.dialogFooter}>
                    <Button
                        type="button"
                        variant="ghost"
                        className={s.clearButton}
                        onClick={() => {
                            return setSelected([]);
                        }}
                    >
                        Очистити день
                    </Button>
                    <span className={s.dialogSpacer} />
                    <Button
                        type="button"
                        className={s.primaryButton}
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            await onSave(selected);
                            setBusy(false);
                        }}
                    >
                        {busy ? 'Збереження…' : `Зберегти (${selected.length}/2)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AnalyticsView = ({ data, year, month }: { data: CalendarData; year: number; month: number }) => {
    const analytics = calculateAnalytics(data, year, month);
    const annual = calculateAnalytics(data, year);
    const maxTopic = Math.max(
        1,
        ...analytics.topics.map((row) => {
            return row.value;
        })
    );
    const maxEmployee = Math.max(
        1,
        ...analytics.employees.map((row) => {
            return row.value;
        })
    );
    const annualMax = Math.max(
        1,
        ...annual.months.map((row) => {
            return row.value;
        })
    );
    return (
        <section className={s.analytics}>
            <div className={s.metricGrid}>
                <article className={s.metricCard}>
                    <span>Усього публікацій</span>
                    <strong>{analytics.total}</strong>
                    <small>
                        <span className={s.positive}>+12%</span> до минулого місяця
                    </small>
                </article>
                <article className={s.metricCard}>
                    <span>Активні групи</span>
                    <strong>{analytics.activeGroups}</strong>
                    <small>У вибраному підрозділі</small>
                </article>
                <article className={s.metricCard}>
                    <span>Заповнених днів</span>
                    <strong>{analytics.filledDays}</strong>
                    <small>Унікальних слотів календаря</small>
                </article>
                <article className={`${s.metricCard} ${s.accentMetric}`}>
                    <span>Публікацій / групу</span>
                    <strong>
                        {analytics.activeGroups ? (analytics.total / analytics.activeGroups).toFixed(1) : '0'}
                    </strong>
                    <small>Середнє значення</small>
                </article>
            </div>
            <div className={s.analyticsGrid}>
                <article className={s.panel}>
                    <div className={s.panelHeading}>
                        <div>
                            <span className={s.eyebrow}>Розподіл</span>
                            <h3>Тематики публікацій</h3>
                        </div>
                        <span className={s.panelTotal}>{analytics.total} усього</span>
                    </div>
                    <div className={s.barList}>
                        {analytics.topics.map((row) => {
                            return (
                                <div className={s.barRow} key={row.label}>
                                    <span className={s.barLabel}>
                                        <i style={{ background: row.color }} />
                                        {row.label}
                                    </span>
                                    <div className={s.barTrack}>
                                        <span
                                            style={{ width: `${(row.value / maxTopic) * 100}%`, background: row.color }}
                                        />
                                    </div>
                                    <strong>{row.value}</strong>
                                </div>
                            );
                        })}
                    </div>
                </article>
                <article className={s.panel}>
                    <div className={s.panelHeading}>
                        <div>
                            <span className={s.eyebrow}>Команда</span>
                            <h3>Відповідальні</h3>
                        </div>
                    </div>
                    <div className={s.employeeList}>
                        {analytics.employees.map((row, index) => {
                            return (
                                <div className={s.employeeRow} key={row.label}>
                                    <span className={s.avatarSmall}>
                                        {row.label
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((part) => {
                                                return part[0];
                                            })
                                            .join('')}
                                    </span>
                                    <span className={s.employeeName}>
                                        {row.label}
                                        <small>{Math.round((row.value / maxEmployee) * 100)}% активності</small>
                                    </span>
                                    <strong>{row.value}</strong>
                                    <span className={s.rank}>#{index + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </div>
            <article className={s.panel}>
                <div className={s.panelHeading}>
                    <div>
                        <span className={s.eyebrow}>Динаміка</span>
                        <h3>Активність за місяцями {year} року</h3>
                    </div>
                </div>
                <div className={s.monthChart}>
                    {annual.months.map((row, index) => {
                        return (
                            <div key={row.label} className={s.monthColumn} data-current={index + 1 === month}>
                                <span className={s.monthValue}>{row.value}</span>
                                <i style={{ height: `${Math.max(5, (row.value / annualMax) * 100)}%` }} />
                                <small>{row.label.slice(0, 3)}</small>
                            </div>
                        );
                    })}
                </div>
            </article>
        </section>
    );
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .slice(0, 2)
        .map((part) => {
            return part[0];
        })
        .join('');
};

const GroupsAndTeamView = ({ data }: { data: CalendarData }) => {
    const groups = [...data.groups].sort((a, b) => {
        return a.position - b.position;
    });
    const employeeGroups = new Map<string, SocialGroup[]>();
    groups.forEach((group) => {
        const assigned = employeeGroups.get(group.employeeId) ?? [];
        assigned.push(group);
        employeeGroups.set(group.employeeId, assigned);
    });
    const employees = [...data.employees].sort((a, b) => {
        return a.fullName.localeCompare(b.fullName, 'uk-UA');
    });

    return (
        <section className={s.directoryPage}>
            <div className={s.summaryGrid}>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <LayoutGrid size={18} />
                    </span>
                    <div>
                        <small>Місцеві групи</small>
                        <strong>{groups.length}</strong>
                    </div>
                </article>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <Users size={18} />
                    </span>
                    <div>
                        <small>Працівники</small>
                        <strong>{employees.length}</strong>
                    </div>
                </article>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <Check size={18} />
                    </span>
                    <div>
                        <small>Активні групи</small>
                        <strong>
                            {
                                groups.filter((group) => {
                                    return group.active;
                                }).length
                            }
                        </strong>
                    </div>
                </article>
            </div>
            <div className={s.readonlyGrid}>
                <article className={`${s.panel} ${s.readonlyPanel}`}>
                    <div className={s.panelHeading}>
                        <div>
                            <span className={s.eyebrow}>Лише перегляд</span>
                            <h3>Місцеві групи</h3>
                        </div>
                        <span className={s.panelTotal}>{groups.length}</span>
                    </div>
                    <div className={s.readonlyScroller}>
                        <table className={s.readonlyTable}>
                            <thead>
                                <tr>
                                    <th>Група</th>
                                    <th>Кущ</th>
                                    <th>Відповідальний</th>
                                    <th>Статус</th>
                                    <th aria-label="Посилання" />
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => {
                                    return (
                                        <tr key={group.id}>
                                            <td>
                                                <strong>{group.name}</strong>
                                                <small>{group.subdivisionName}</small>
                                            </td>
                                            <td>{group.bush}</td>
                                            <td>{group.employeeName}</td>
                                            <td>
                                                <span className={s.statusBadge} data-active={group.active}>
                                                    {group.active ? 'Активна' : 'Неактивна'}
                                                </span>
                                            </td>
                                            <td>
                                                <a
                                                    href={group.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label={`Відкрити ${group.name}`}
                                                >
                                                    <ExternalLink size={15} />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </article>
                <article className={`${s.panel} ${s.readonlyPanel}`}>
                    <div className={s.panelHeading}>
                        <div>
                            <span className={s.eyebrow}>Лише перегляд</span>
                            <h3>Команда</h3>
                        </div>
                        <span className={s.panelTotal}>{employees.length}</span>
                    </div>
                    <div className={s.teamList}>
                        {employees.map((employee) => {
                            const assignedGroups = employeeGroups.get(employee.id) ?? [];
                            return (
                                <div className={s.teamRow} key={employee.id}>
                                    <span className={s.avatarSmall}>{getInitials(employee.fullName)}</span>
                                    <span className={s.employeeName}>
                                        {employee.fullName}
                                        <small>
                                            {assignedGroups.length
                                                ? assignedGroups
                                                      .map((group) => {
                                                          return group.name;
                                                      })
                                                      .join(', ')
                                                : 'Групи не призначені'}
                                        </small>
                                    </span>
                                    <strong>{assignedGroups.length}</strong>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </div>
        </section>
    );
};

const StructureView = ({ data, workspace }: { data: CalendarData; workspace: WorkspaceSubdivision }) => {
    const structure = [
        ...new Map(
            data.subdivisions.map((subdivision) => {
                return [
                    subdivision.managementId,
                    {
                        id: subdivision.managementId,
                        name: subdivision.managementName,
                        subdivisions: data.subdivisions.filter((item) => {
                            return item.managementId === subdivision.managementId;
                        }),
                    },
                ];
            })
        ).values(),
    ];

    return (
        <section className={s.structurePage}>
            <div className={s.summaryGrid}>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <LayoutGrid size={18} />
                    </span>
                    <div>
                        <small>Управління</small>
                        <strong>{structure.length}</strong>
                    </div>
                </article>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <CalendarDays size={18} />
                    </span>
                    <div>
                        <small>Підрозділи</small>
                        <strong>{data.subdivisions.length}</strong>
                    </div>
                </article>
                <article className={s.summaryCard}>
                    <span className={s.summaryIcon}>
                        <Users size={18} />
                    </span>
                    <div>
                        <small>Кущі</small>
                        <strong>{data.bushes.length}</strong>
                    </div>
                </article>
            </div>
            <div className={s.structureGrid}>
                <div className={s.structureList}>
                    {structure.map((management) => {
                        return (
                            <article className={s.structureCard} key={management.id}>
                                <div className={s.structureHeader}>
                                    <span className={s.structureIcon}>
                                        <LayoutGrid size={17} />
                                    </span>
                                    <div>
                                        <small>Управління</small>
                                        <h3>{management.name}</h3>
                                    </div>
                                    <span className={s.panelTotal}>{management.subdivisions.length}</span>
                                </div>
                                <div className={s.subdivisionList}>
                                    {management.subdivisions.map((subdivision) => {
                                        const current = subdivision.id === workspace.id;
                                        return (
                                            <div
                                                className={s.subdivisionRow}
                                                data-current={current}
                                                key={subdivision.id}
                                            >
                                                <span />
                                                <div>
                                                    <strong>{subdivision.name}</strong>
                                                    <small>{current ? 'Поточний робочий простір' : 'Підрозділ'}</small>
                                                </div>
                                                {current && <span className={s.currentBadge}>Вибрано</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </div>
                <article className={`${s.panel} ${s.bushPanel}`}>
                    <div className={s.panelHeading}>
                        <div>
                            <span className={s.eyebrow}>Довідник</span>
                            <h3>Кущі</h3>
                        </div>
                        <span className={s.panelTotal}>{data.bushes.length}</span>
                    </div>
                    <div className={s.bushList}>
                        {data.bushes.map((bush) => {
                            const groupCount = data.groups.filter((group) => {
                                return group.bush === bush;
                            }).length;
                            return (
                                <div key={bush}>
                                    <span>{bush}</span>
                                    <small>
                                        {groupCount ? `${groupCount} груп` : 'Немає груп у вибраному підрозділі'}
                                    </small>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </div>
        </section>
    );
};

const SettingsView = () => {
    return (
        <section className={s.comingSoon}>
            <span>
                <Settings size={28} />
            </span>
            <small>Налаштування</small>
            <h2>Сторінка в розробці</h2>
            <p>Тут з’являться параметри календаря, інтеграцій та робочого простору.</p>
        </section>
    );
};

const VIEW_COPY: Record<View, { eyebrow: string; title: string; description: string }> = {
    calendar: {
        eyebrow: 'Робочий календар',
        title: 'Публікації у місцевих групах',
        description: 'Фіксуйте тематику публікацій та відстежуйте активність команди.',
    },
    analytics: {
        eyebrow: 'Зведена статистика',
        title: 'Аналітика публікацій',
        description: 'Оцінюйте активність підрозділів, тематик і відповідальних.',
    },
    groups: {
        eyebrow: 'Довідник',
        title: 'Групи та команда',
        description: 'Переглядайте місцеві групи та закріплених за ними працівників.',
    },
    structure: {
        eyebrow: 'Організація',
        title: 'Структура компанії',
        description: 'Актуальна ієрархія управлінь, підрозділів і кущів.',
    },
    settings: {
        eyebrow: 'Адміністрування',
        title: 'Налаштування',
        description: 'Параметри календаря та робочого простору.',
    },
};

const Home: React.FC = () => {
    const routeSearch = Route.useSearch();
    const navigate = Route.useNavigate();
    const [data, setData] = React.useState<CalendarData | null>(null);
    const [search, setSearch] = React.useState('');
    const [cellSelection, setCellSelection] = React.useState<CellSelection>(null);
    const [editingGroup, setEditingGroup] = React.useState<SocialGroup | 'new' | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [savedAt, setSavedAt] = React.useState<Date | null>(null);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [reloadKey, setReloadKey] = React.useState(0);
    const view: View = routeSearch.view ?? 'calendar';
    const viewCopy = VIEW_COPY[view];
    const year = routeSearch.year ?? initialYear;
    const month = routeSearch.month ?? initialMonth;
    const subdivisionId = routeSearch.subdivision ?? calendarApi.defaultSubdivisionId;

    const updateRoute = React.useCallback(
        (patch: Partial<typeof routeSearch>, replace = false) => {
            void navigate({
                replace,
                search: (previous) => {
                    return { ...previous, ...patch };
                },
            });
        },
        [navigate]
    );

    React.useEffect(() => {
        let ignore = false;
        void calendarApi
            .getCalendar(subdivisionId, year, month)
            .then((calendar) => {
                if (ignore) return;
                setLoadError(null);
                setData(calendar);
            })
            .catch((error: unknown) => {
                if (ignore) return;
                const message = error instanceof Error ? error.message : 'Не вдалося завантажити календар.';
                setLoadError(message);
            });
        return () => {
            ignore = true;
        };
    }, [month, reloadKey, subdivisionId, year]);

    React.useEffect(() => {
        if (!data || data.subdivisions.length === 0) return;
        const requestedSubdivision = data.subdivisions.find((item) => {
            return item.id === routeSearch.subdivision;
        });
        const requestedManagementSubdivision = data.subdivisions.find((item) => {
            return item.managementId === routeSearch.management;
        });
        const workspace =
            requestedSubdivision &&
            (!routeSearch.management || requestedSubdivision.managementId === routeSearch.management)
                ? requestedSubdivision
                : (requestedManagementSubdivision ?? requestedSubdivision ?? data.subdivisions[0]);
        if (
            routeSearch.management === workspace.managementId &&
            routeSearch.subdivision === workspace.id &&
            routeSearch.view === view &&
            routeSearch.year === year &&
            routeSearch.month === month
        )
            return;
        updateRoute(
            {
                management: workspace.managementId,
                subdivision: workspace.id,
                view,
                year,
                month,
            },
            true
        );
    }, [data, month, routeSearch, updateRoute, view, year]);

    if (loadError) {
        return (
            <main className={s.loginPage}>
                <section className={s.loginCard}>
                    <span className={s.eyebrow}>Помилка завантаження</span>
                    <h1>Не вдалося відкрити календар</h1>
                    <p>{loadError}</p>
                    <Button
                        type="button"
                        className={s.primaryButton}
                        onClick={() => {
                            return setReloadKey((value) => {
                                return value + 1;
                            });
                        }}
                    >
                        Спробувати ще раз
                    </Button>
                </section>
            </main>
        );
    }

    if (!data)
        return (
            <div className={s.loading}>
                <span className={s.loader} />
                Завантажуємо календар…
            </div>
        );

    const workspace =
        data.subdivisions.find((item) => {
            return item.id === subdivisionId;
        }) ?? data.subdivisions[0];
    if (!workspace) throw new Error('У Supabase немає активних підрозділів.');
    const managements = [
        ...new Map(
            data.subdivisions.map((item) => {
                return [item.managementId, { id: item.managementId, name: item.managementName }];
            })
        ).values(),
    ];
    const managementSubdivisions = data.subdivisions.filter((item) => {
        return item.managementId === workspace.managementId;
    });

    const days = Array.from({ length: getDaysInMonth(year, month) }, (_, index) => {
        return index + 1;
    });
    const todayKey = new Date().toISOString().slice(0, 10);
    const groups = data.groups
        .filter((group) => {
            return group.active && group.name.toLocaleLowerCase('uk-UA').includes(search.toLocaleLowerCase('uk-UA'));
        })
        .sort((a, b) => {
            return a.position - b.position;
        });

    const saveTopics = async (topics: Topic[]) => {
        if (!cellSelection) return;
        setSaving(true);
        try {
            setData(await calendarApi.setTopics(cellSelection.groupId, cellSelection.date, topics, workspace.id));
            setSavedAt(new Date());
            setCellSelection(null);
            toast.success('Публікації збережено');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти зміни.');
        } finally {
            setSaving(false);
        }
    };

    const saveGroup = async (group: SocialGroup) => {
        try {
            setData(await calendarApi.saveGroup(group, year, month));
            setEditingGroup(null);
            setSavedAt(new Date());
            toast.success(group.active ? 'Групу збережено' : 'Групу деактивовано');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти групу.');
        }
    };

    return (
        <div className={s.app}>
            <aside className={s.sidebar}>
                <div className={s.brand}>
                    <span className={s.brandMark}>
                        <CalendarDays size={19} />
                    </span>
                    <span>
                        Публікації<small>Календар груп</small>
                    </span>
                </div>
                <nav className={s.nav} aria-label="Головна навігація">
                    <span className={s.navLabel}>Робочий простір</span>
                    <Button
                        type="button"
                        variant="ghost"
                        data-active={view === 'calendar'}
                        onClick={() => {
                            return updateRoute({ view: 'calendar' });
                        }}
                    >
                        <CalendarDays size={18} />
                        Календар
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        data-active={view === 'analytics'}
                        onClick={() => {
                            return updateRoute({ view: 'analytics' });
                        }}
                    >
                        <BarChart3 size={18} />
                        Аналітика
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        data-active={view === 'groups'}
                        onClick={() => {
                            return updateRoute({ view: 'groups' });
                        }}
                    >
                        <Users size={18} />
                        Групи та команда
                    </Button>
                    <span className={s.navLabel}>Адміністрування</span>
                    <Button
                        type="button"
                        variant="ghost"
                        data-active={view === 'structure'}
                        onClick={() => {
                            return updateRoute({ view: 'structure' });
                        }}
                    >
                        <LayoutGrid size={18} />
                        Структура
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        data-active={view === 'settings'}
                        onClick={() => {
                            return updateRoute({ view: 'settings' });
                        }}
                    >
                        <Settings size={18} />
                        Налаштування
                    </Button>
                </nav>
                <div className={s.sidebarBottom}>
                    <div className={s.demoCard}>
                        <Sparkles size={18} />
                        <div>
                            <strong>{calendarApi.mode === 'demo' ? 'Демо-режим' : 'Supabase'}</strong>
                            <span>
                                {calendarApi.mode === 'demo' ? 'Дані збережено локально' : 'Підключено до хмари'}
                            </span>
                        </div>
                    </div>
                    {calendarApi.mode === 'demo' && (
                        <Button
                            type="button"
                            variant="ghost"
                            className={s.resetLink}
                            onClick={async () => {
                                setData(await calendarApi.resetDemo());
                                toast.success('Демо-дані відновлено');
                            }}
                        >
                            <RotateCcw size={15} />
                            Відновити демо
                        </Button>
                    )}
                </div>
            </aside>
            <main className={s.main}>
                <header className={s.topbar}>
                    <div className={s.breadcrumbs} aria-label="Вибір робочого простору">
                        <label>
                            <span>Управління</span>
                            <Select
                                value={workspace.managementId}
                                onValueChange={(value) => {
                                    const nextSubdivision = data.subdivisions.find((item) => {
                                        return item.managementId === value;
                                    });
                                    if (nextSubdivision)
                                        updateRoute({
                                            management: nextSubdivision.managementId,
                                            subdivision: nextSubdivision.id,
                                        });
                                }}
                            >
                                <SelectTrigger aria-label="Управління">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {managements.map((item) => {
                                        return (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </label>
                        <ChevronRight size={15} aria-hidden="true" />
                        <label>
                            <span>Підрозділ</span>
                            <Select
                                value={workspace.id}
                                onValueChange={(value) => {
                                    return updateRoute({ subdivision: value });
                                }}
                            >
                                <SelectTrigger aria-label="Підрозділ">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {managementSubdivisions.map((item) => {
                                        return (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </label>
                    </div>
                    <div className={s.status} data-saving={saving}>
                        <span />
                        {saving ? 'Зберігаємо…' : formatSavedTime(savedAt)}
                    </div>
                </header>
                <div className={s.content}>
                    <div className={s.pageHeading}>
                        <div>
                            <span className={s.eyebrow}>{viewCopy.eyebrow}</span>
                            <h1>{viewCopy.title}</h1>
                            <p>{viewCopy.description}</p>
                        </div>
                        {view === 'calendar' && (
                            <Button
                                type="button"
                                className={s.primaryButton}
                                onClick={() => {
                                    return setEditingGroup('new');
                                }}
                            >
                                <Plus size={17} />
                                Додати групу
                            </Button>
                        )}
                    </div>
                    <Tabs
                        className={view === 'calendar' || view === 'analytics' ? s.calendarWorkspace : undefined}
                        value={view}
                        onValueChange={(nextView) => {
                            return updateRoute({ view: nextView as View });
                        }}
                    >
                        <div className={s.toolbar} hidden={view !== 'calendar' && view !== 'analytics'}>
                            <TabsList className={s.segmented} aria-label="Режим перегляду">
                                <TabsTrigger value="calendar">
                                    <CalendarDays size={16} />
                                    Календар
                                </TabsTrigger>
                                <TabsTrigger value="analytics">
                                    <BarChart3 size={16} />
                                    Аналітика
                                </TabsTrigger>
                            </TabsList>
                            <div className={s.toolbarSpacer} />
                            {view === 'calendar' && (
                                <label className={s.search}>
                                    <Search size={16} />
                                    <Input
                                        aria-label="Пошук групи"
                                        placeholder="Знайти групу…"
                                        value={search}
                                        onChange={(event) => {
                                            return setSearch(event.target.value);
                                        }}
                                    />
                                </label>
                            )}
                            <Select
                                value={String(month)}
                                onValueChange={(value) => {
                                    return updateRoute({ month: Number(value) });
                                }}
                            >
                                <SelectTrigger aria-label="Місяць">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((label, index) => {
                                        return (
                                            <SelectItem value={String(index + 1)} key={label}>
                                                {label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(year)}
                                onValueChange={(value) => {
                                    return updateRoute({ year: Number(value) });
                                }}
                            >
                                <SelectTrigger aria-label="Рік">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEARS.map((item) => {
                                        return (
                                            <SelectItem key={item} value={String(item)}>
                                                {item}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                className={s.todayButton}
                                onClick={() => {
                                    updateRoute({ year: initialYear, month: initialMonth });
                                }}
                            >
                                Сьогодні
                            </Button>
                        </div>
                        <TabsContent value="analytics">
                            <AnalyticsView data={data} year={year} month={month} />
                        </TabsContent>
                        <TabsContent value="calendar" className={s.calendarContent}>
                            <section className={s.calendarCard}>
                                <div className={s.calendarMeta}>
                                    <span>
                                        <strong>
                                            {MONTHS[month - 1]} {year}
                                        </strong>{' '}
                                        · {groups.length} активних груп
                                    </span>
                                    <span className={s.legend}>
                                        <i />
                                        Вихідний <i />
                                        Сьогодні
                                    </span>
                                </div>
                                <div className={s.tableScroller}>
                                    <table className={s.calendarTable}>
                                        <thead>
                                            <tr>
                                                <th className={s.stickyGroup}>Місцева група</th>
                                                <th className={s.stickyOwner}>Відповідальний</th>
                                                {days.map((day) => {
                                                    const date = toDateKey(year, month, day);
                                                    return (
                                                        <th
                                                            key={day}
                                                            data-weekend={isWeekend(year, month, day)}
                                                            data-today={date === todayKey}
                                                        >
                                                            <span>{weekdayShort(year, month, day)}</span>
                                                            {day}
                                                        </th>
                                                    );
                                                })}
                                                <th>Разом</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groups.map((group) => {
                                                const groupEntries = data.entries.filter((entry) => {
                                                    return (
                                                        entry.groupId === group.id &&
                                                        entry.date.startsWith(
                                                            `${year}-${String(month).padStart(2, '0')}`
                                                        )
                                                    );
                                                });
                                                return (
                                                    <tr key={group.id}>
                                                        <td className={s.stickyGroup}>
                                                            <button
                                                                type="button"
                                                                className={s.groupName}
                                                                onClick={() => {
                                                                    return setEditingGroup(group);
                                                                }}
                                                            >
                                                                {group.name}
                                                                <span>{group.bush}</span>
                                                            </button>
                                                            <a
                                                                href={group.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                aria-label={`Відкрити ${group.name}`}
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        </td>
                                                        <td className={s.stickyOwner}>
                                                            <span className={s.ownerAvatar}>
                                                                {group.employeeName
                                                                    .split(' ')
                                                                    .slice(0, 2)
                                                                    .map((part) => {
                                                                        return part[0];
                                                                    })
                                                                    .join('')}
                                                            </span>
                                                            <span>
                                                                {group.employeeName.split(' ').slice(0, 2).join(' ')}
                                                            </span>
                                                        </td>
                                                        {days.map((day) => {
                                                            const date = toDateKey(year, month, day);
                                                            const entry = groupEntries.find((item) => {
                                                                return item.date === date;
                                                            });
                                                            return (
                                                                <td
                                                                    key={date}
                                                                    data-weekend={isWeekend(year, month, day)}
                                                                    data-today={date === todayKey}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className={s.dayCell}
                                                                        onClick={() => {
                                                                            return setCellSelection({
                                                                                groupId: group.id,
                                                                                date,
                                                                            });
                                                                        }}
                                                                        aria-label={`${group.name}, ${day} ${MONTHS[month - 1]}`}
                                                                    >
                                                                        {entry?.topics.map((topic) => {
                                                                            return (
                                                                                <span
                                                                                    key={topic}
                                                                                    title={topic}
                                                                                    style={
                                                                                        {
                                                                                            '--topic':
                                                                                                TOPIC_META[topic].color,
                                                                                            '--topic-soft':
                                                                                                TOPIC_META[topic].soft,
                                                                                        } as React.CSSProperties
                                                                                    }
                                                                                >
                                                                                    {TOPIC_META[topic].short}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                        {!entry && <Plus size={13} />}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={s.totalCell}>
                                                            {groupEntries.reduce((sum, entry) => {
                                                                return sum + entry.topics.length;
                                                            }, 0)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {groups.length === 0 && (
                                        <div className={s.empty}>
                                            <Search size={28} />
                                            <strong>Груп не знайдено</strong>
                                            <span>Змініть пошуковий запит або додайте нову групу.</span>
                                        </div>
                                    )}
                                </div>
                                <footer className={s.calendarFooter}>
                                    <span>
                                        <CircleHelp size={15} />
                                        Натисніть на клітинку дня, щоб додати до двох тематик
                                    </span>
                                    <strong>{calculateAnalytics(data, year, month).total} публікацій за місяць</strong>
                                </footer>
                            </section>
                        </TabsContent>
                    </Tabs>
                    {view === 'groups' && <GroupsAndTeamView data={data} />}
                    {view === 'structure' && <StructureView data={data} workspace={workspace} />}
                    {view === 'settings' && <SettingsView />}
                </div>
            </main>
            {cellSelection && (
                <TopicDialog
                    selection={cellSelection}
                    data={data}
                    onClose={() => {
                        return setCellSelection(null);
                    }}
                    onSave={saveTopics}
                />
            )}
            {editingGroup && (
                <GroupDialog
                    data={data}
                    group={editingGroup === 'new' ? null : editingGroup}
                    workspace={workspace}
                    onClose={() => {
                        return setEditingGroup(null);
                    }}
                    onSave={saveGroup}
                />
            )}
            <Toaster position="bottom-right" richColors closeButton />
        </div>
    );
};

export default Home;
