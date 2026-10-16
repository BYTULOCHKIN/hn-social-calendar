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
    ChevronDown,
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
import s from './style.module.css';

type View = 'calendar' | 'analytics';
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
    const [name, setName] = React.useState(group?.name ?? '');
    const [url, setUrl] = React.useState(group?.url ?? '');
    const [bush, setBush] = React.useState(group?.bush ?? data.bushes[0] ?? '');
    const [employeeSearch, setEmployeeSearch] = React.useState('');
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
    const normalizedEmployeeSearch = employeeSearch.trim().toLocaleLowerCase('uk-UA');
    const filteredEmployees = data.employees.filter((item) => {
        return item.id === employeeId || item.fullName.toLocaleLowerCase('uk-UA').includes(normalizedEmployeeSearch);
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
        <div className={s.overlay} role="presentation" onMouseDown={onClose}>
            <form
                className={s.dialog}
                onSubmit={submit}
                onMouseDown={(event) => {
                    return event.stopPropagation();
                }}
            >
                <div className={s.dialogHeader}>
                    <div>
                        <span className={s.eyebrow}>Реєстр груп</span>
                        <h2>{group ? 'Редагувати групу' : 'Нова місцева група'}</h2>
                    </div>
                    <button type="button" className={s.iconButton} onClick={onClose} aria-label="Закрити">
                        <X size={18} />
                    </button>
                </div>
                <label className={s.field}>
                    <span>Назва групи</span>
                    <input
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
                        <input
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
                        <select
                            value={bush}
                            onChange={(event) => {
                                return setBush(event.target.value);
                            }}
                        >
                            {data.bushes.map((item) => {
                                return <option key={item}>{item}</option>;
                            })}
                        </select>
                    </label>
                    <label className={s.field}>
                        <span>Відповідальний</span>
                        <div className={s.employeePicker}>
                            <input
                                value={employeeSearch}
                                onChange={(event) => {
                                    return setEmployeeSearch(event.target.value);
                                }}
                                placeholder="Пошук за ПІБ…"
                                aria-label="Пошук відповідального за ПІБ"
                            />
                            <select
                                value={employeeId}
                                onChange={(event) => {
                                    return setEmployeeId(event.target.value);
                                }}
                            >
                                {filteredEmployees.map((item) => {
                                    return (
                                        <option key={item.id} value={item.id}>
                                            {item.fullName}
                                        </option>
                                    );
                                })}
                            </select>
                            <small>
                                Знайдено {filteredEmployees.length} із {data.employees.length}
                            </small>
                        </div>
                    </label>
                </div>
                <div className={s.dialogFooter}>
                    {group && (
                        <button
                            type="button"
                            className={s.deactivateButton}
                            onClick={() => {
                                return onSave({ ...group, active: false });
                            }}
                        >
                            Деактивувати
                        </button>
                    )}
                    <span className={s.dialogSpacer} />
                    <button type="button" className={s.secondaryButton} onClick={onClose}>
                        Скасувати
                    </button>
                    <button type="submit" className={s.primaryButton} disabled={busy}>
                        {busy ? 'Збереження…' : 'Зберегти групу'}
                    </button>
                </div>
            </form>
        </div>
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
        <div className={s.overlay} role="presentation" onMouseDown={onClose}>
            <div
                className={`${s.dialog} ${s.topicDialog}`}
                onMouseDown={(event) => {
                    return event.stopPropagation();
                }}
            >
                <div className={s.dialogHeader}>
                    <div>
                        <span className={s.eyebrow}>{group?.name}</span>
                        <h2>
                            {new Date(`${selection.date}T00:00:00`).toLocaleDateString('uk-UA', { dateStyle: 'long' })}
                        </h2>
                    </div>
                    <button type="button" className={s.iconButton} onClick={onClose} aria-label="Закрити">
                        <X size={18} />
                    </button>
                </div>
                <p className={s.dialogDescription}>
                    Оберіть до двох тематик. Кожна тематика рахується як окрема публікація.
                </p>
                <div className={s.topicOptions}>
                    {TOPICS.map((topic) => {
                        const active = selected.includes(topic);
                        return (
                            <button
                                key={topic}
                                type="button"
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
                            </button>
                        );
                    })}
                </div>
                <div className={s.dialogFooter}>
                    <button
                        type="button"
                        className={s.clearButton}
                        onClick={() => {
                            return setSelected([]);
                        }}
                    >
                        Очистити день
                    </button>
                    <span className={s.dialogSpacer} />
                    <button
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
                    </button>
                </div>
            </div>
        </div>
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
                    <button
                        type="button"
                        className={s.primaryButton}
                        onClick={() => {
                            return setReloadKey((value) => {
                                return value + 1;
                            });
                        }}
                    >
                        Спробувати ще раз
                    </button>
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
                    <button
                        type="button"
                        data-active={view === 'calendar'}
                        onClick={() => {
                            return updateRoute({ view: 'calendar' });
                        }}
                    >
                        <CalendarDays size={18} />
                        Календар
                    </button>
                    <button
                        type="button"
                        data-active={view === 'analytics'}
                        onClick={() => {
                            return updateRoute({ view: 'analytics' });
                        }}
                    >
                        <BarChart3 size={18} />
                        Аналітика
                    </button>
                    <button type="button">
                        <Users size={18} />
                        Групи та команда
                    </button>
                    <span className={s.navLabel}>Адміністрування</span>
                    <button type="button">
                        <LayoutGrid size={18} />
                        Структура
                    </button>
                    <button type="button">
                        <Settings size={18} />
                        Налаштування
                    </button>
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
                        <button
                            type="button"
                            className={s.resetLink}
                            onClick={async () => {
                                setData(await calendarApi.resetDemo());
                                toast.success('Демо-дані відновлено');
                            }}
                        >
                            <RotateCcw size={15} />
                            Відновити демо
                        </button>
                    )}
                    <div className={s.profile}>
                        <span className={s.avatar}>ОК</span>
                        <span>
                            Олена Ковальчук<small>Адміністратор</small>
                        </span>
                        <ChevronDown size={16} />
                    </div>
                </div>
            </aside>
            <main className={s.main}>
                <header className={s.topbar}>
                    <div className={s.breadcrumbs} aria-label="Вибір робочого простору">
                        <label>
                            <span>Управління</span>
                            <select
                                aria-label="Управління"
                                value={workspace.managementId}
                                onChange={(event) => {
                                    const nextSubdivision = data.subdivisions.find((item) => {
                                        return item.managementId === event.target.value;
                                    });
                                    if (nextSubdivision)
                                        updateRoute({
                                            management: nextSubdivision.managementId,
                                            subdivision: nextSubdivision.id,
                                        });
                                }}
                            >
                                {managements.map((item) => {
                                    return (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                        <ChevronRight size={15} aria-hidden="true" />
                        <label>
                            <span>Підрозділ</span>
                            <select
                                aria-label="Підрозділ"
                                value={workspace.id}
                                onChange={(event) => {
                                    return updateRoute({ subdivision: event.target.value });
                                }}
                            >
                                {managementSubdivisions.map((item) => {
                                    return (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    );
                                })}
                            </select>
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
                            <span className={s.eyebrow}>
                                {view === 'calendar' ? 'Робочий календар' : 'Зведена статистика'}
                            </span>
                            <h1>{view === 'calendar' ? 'Публікації у місцевих групах' : 'Аналітика публікацій'}</h1>
                            <p>
                                {view === 'calendar'
                                    ? 'Фіксуйте тематику публікацій та відстежуйте активність команди.'
                                    : 'Оцінюйте активність підрозділів, тематик і відповідальних.'}
                            </p>
                        </div>
                        {view === 'calendar' && (
                            <button
                                type="button"
                                className={s.primaryButton}
                                onClick={() => {
                                    return setEditingGroup('new');
                                }}
                            >
                                <Plus size={17} />
                                Додати групу
                            </button>
                        )}
                    </div>
                    <div className={s.toolbar}>
                        <div className={s.segmented}>
                            <button
                                type="button"
                                data-active={view === 'calendar'}
                                onClick={() => {
                                    return updateRoute({ view: 'calendar' });
                                }}
                            >
                                <CalendarDays size={16} />
                                Календар
                            </button>
                            <button
                                type="button"
                                data-active={view === 'analytics'}
                                onClick={() => {
                                    return updateRoute({ view: 'analytics' });
                                }}
                            >
                                <BarChart3 size={16} />
                                Аналітика
                            </button>
                        </div>
                        <div className={s.toolbarSpacer} />
                        {view === 'calendar' && (
                            <label className={s.search}>
                                <Search size={16} />
                                <input
                                    aria-label="Пошук групи"
                                    placeholder="Знайти групу…"
                                    value={search}
                                    onChange={(event) => {
                                        return setSearch(event.target.value);
                                    }}
                                />
                            </label>
                        )}
                        <select
                            aria-label="Місяць"
                            value={month}
                            onChange={(event) => {
                                return updateRoute({ month: Number(event.target.value) });
                            }}
                        >
                            {MONTHS.map((label, index) => {
                                return (
                                    <option value={index + 1} key={label}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                        <select
                            aria-label="Рік"
                            value={year}
                            onChange={(event) => {
                                return updateRoute({ year: Number(event.target.value) });
                            }}
                        >
                            {YEARS.map((item) => {
                                return <option key={item}>{item}</option>;
                            })}
                        </select>
                        <button
                            type="button"
                            className={s.todayButton}
                            onClick={() => {
                                updateRoute({ year: initialYear, month: initialMonth });
                            }}
                        >
                            Сьогодні
                        </button>
                    </div>
                    {view === 'analytics' ? (
                        <AnalyticsView data={data} year={year} month={month} />
                    ) : (
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
                                                    entry.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)
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
                    )}
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
