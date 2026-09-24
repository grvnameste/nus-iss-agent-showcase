'use client';

import { cn } from '@/lib/cn';
import {
  COURSE_LEVELS,
  COURSE_LEVEL_LABELS,
  COURSE_TYPES,
  COURSE_TYPE_LABELS,
  COURSE_AVAILABILITIES,
  AVAILABILITY_LABELS,
  DELIVERY_MODES,
  DELIVERY_MODE_LABELS,
  DISCIPLINES,
  type CourseAvailability,
  type CourseLevel,
  type CourseType,
  type DeliveryMode,
} from '@/lib/courses/types';

/**
 * Filter controls (FR-230–FR-234). Options derive from the shared enum
 * constants so UI and API never drift. Each group is a labelled fieldset of
 * checkboxes; multiple selections map to repeated query params (OR within field,
 * AND across fields — enforced by the backend). Presentation only.
 */

export interface CourseFilterState {
  discipline: string[];
  courseType: CourseType[];
  level: CourseLevel[];
  deliveryMode: DeliveryMode[];
  availability: CourseAvailability[];
}

export const EMPTY_FILTERS: CourseFilterState = {
  discipline: [],
  courseType: [],
  level: [],
  deliveryMode: [],
  availability: [],
};

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function FilterGroup<T extends string>({
  legend,
  name,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}): React.JSX.Element {
  return (
    <fieldset className="border-t border-slate-200 py-3">
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      <div className="mt-2 space-y-1.5">
        {options.map((option) => {
          const id = `${name}-${option}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                id={id}
                type="checkbox"
                name={name}
                value={option}
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-2 focus:ring-sky-500"
              />
              {labels[option]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const DISCIPLINE_LABELS = Object.fromEntries(
  DISCIPLINES.map((discipline) => [discipline, discipline]),
) as Record<(typeof DISCIPLINES)[number], string>;

export function CourseFilters({
  filters,
  onChange,
  className,
}: {
  filters: CourseFilterState;
  onChange: (next: CourseFilterState) => void;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-1', className)}>
      <FilterGroup
        legend="Discipline"
        name="discipline"
        options={DISCIPLINES}
        labels={DISCIPLINE_LABELS}
        selected={filters.discipline as (typeof DISCIPLINES)[number][]}
        onToggle={(value) =>
          onChange({ ...filters, discipline: toggle(filters.discipline, value) })
        }
      />
      <FilterGroup
        legend="Course type"
        name="courseType"
        options={COURSE_TYPES}
        labels={COURSE_TYPE_LABELS}
        selected={filters.courseType}
        onToggle={(value) =>
          onChange({ ...filters, courseType: toggle(filters.courseType, value) })
        }
      />
      <FilterGroup
        legend="Level"
        name="level"
        options={COURSE_LEVELS}
        labels={COURSE_LEVEL_LABELS}
        selected={filters.level}
        onToggle={(value) =>
          onChange({ ...filters, level: toggle(filters.level, value) })
        }
      />
      <FilterGroup
        legend="Delivery mode"
        name="deliveryMode"
        options={DELIVERY_MODES}
        labels={DELIVERY_MODE_LABELS}
        selected={filters.deliveryMode}
        onToggle={(value) =>
          onChange({ ...filters, deliveryMode: toggle(filters.deliveryMode, value) })
        }
      />
      <FilterGroup
        legend="Availability"
        name="availability"
        options={COURSE_AVAILABILITIES}
        labels={AVAILABILITY_LABELS}
        selected={filters.availability}
        onToggle={(value) =>
          onChange({ ...filters, availability: toggle(filters.availability, value) })
        }
      />
    </div>
  );
}

/** True when no filter is selected. */
export function filtersAreEmpty(filters: CourseFilterState): boolean {
  return (
    filters.discipline.length === 0 &&
    filters.courseType.length === 0 &&
    filters.level.length === 0 &&
    filters.deliveryMode.length === 0 &&
    filters.availability.length === 0
  );
}
