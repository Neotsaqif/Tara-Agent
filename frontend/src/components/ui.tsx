import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export const asset = (name: string) =>
  `${import.meta.env.BASE_URL}assets/figma/${name}.svg`;
export function Icon({
  name,
  brand = false,
}: {
  name: string;
  brand?: boolean;
}) {
  return (
    <img className={brand ? "brand-icon" : "icon"} src={asset(name)} alt="" />
  );
}
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type="button"
      className={`button ${variant} ${className}`}
      {...props}
    />
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {subtitle && <p className="caption muted">{subtitle}</p>}
      {children}
    </section>
  );
}
export type Metric = {
  label: string;
  value: string;
  note: string;
  tone?: "danger" | "warning";
};
export function Metrics({ items }: { items: Metric[] }) {
  return (
    <div className="metrics">
      {items.map((item) => (
        <section className="metric" key={item.label}>
          <h2>{item.label}</h2>
          <p className="metric-value">{item.value}</p>
          <p className={`metric-note ${item.tone ?? "success"}`}>{item.note}</p>
        </section>
      ))}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "error";
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function EmptyState({
  title = "Belum ada data",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Card className="empty-state">
      <h2>{title}</h2>
      <p className="muted">{children}</p>
    </Card>
  );
}
export function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`field ${className}`}>
      <span>{label}</span>
      <span className="select-wrap">
        <select
          id={id}
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <Icon name="IconChevron" />
      </span>
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <button
        type="button"
        className="icon-button modal-close"
        onClick={onClose}
        aria-label="Tutup dialog"
      >
        <Icon name="CloseDialog" />
      </button>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
export function DemoLabel() {
  return (
    <p className="demo-label">
      Demo / simulasi · Data ilustrasi Figma, bukan data bisnis aktual.
    </p>
  );
}
export function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card title={title}>
      <div
        className="table-scroll"
        role="region"
        aria-label={title}
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) =>
                  column === 0 ? (
                    <th key={column} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={column}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
