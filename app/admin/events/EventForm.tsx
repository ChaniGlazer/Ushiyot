import { Button, Input } from "@/components/ui";
import { VOCABULARY_STYLES } from "@/lib/creators";
import styles from "./EventForm.module.css";

const VOCABULARY_STYLE_OPTIONS = [...VOCABULARY_STYLES, "הכל"];

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  secret: string;
  submitLabel: string;
  defaultValues?: {
    id?: number;
    title?: string;
    description?: string;
    sectors?: string[];
    startDate?: string;
    endDate?: string;
    active?: boolean;
  };
};

export default function EventForm({ action, secret, submitLabel, defaultValues }: Props) {
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="secret" value={secret} />
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <Input label="כותרת" type="text" name="title" defaultValue={defaultValues?.title} required />

      <label className={styles.field}>
        <span>תיאור / הקשר ל-AI</span>
        <textarea
          name="description"
          defaultValue={defaultValues?.description}
          required
          rows={2}
          className={styles.textarea}
        />
      </label>

      <div className={styles.field}>
        <span className={styles.sectorsLabel}>סגנונות שפה רלוונטיים</span>
        <div className={styles.sectorsRow}>
          {VOCABULARY_STYLE_OPTIONS.map((style) => (
            <label key={style} className={styles.checkboxOption}>
              <input
                type="checkbox"
                name="relevant_sectors"
                value={style}
                defaultChecked={defaultValues?.sectors?.includes(style)}
              />
              {style}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.dateRow}>
        <div className={styles.dateField}>
          <Input label="מתאריך" type="date" name="start_date" defaultValue={defaultValues?.startDate} required />
        </div>
        <div className={styles.dateField}>
          <Input label="עד תאריך" type="date" name="end_date" defaultValue={defaultValues?.endDate} required />
        </div>
      </div>

      <label className={styles.checkboxOption}>
        <input type="checkbox" name="active" defaultChecked={defaultValues?.active ?? true} />
        <span>פעיל</span>
      </label>

      <Button type="submit" variant="primary" className={styles.submitButton}>
        {submitLabel}
      </Button>
    </form>
  );
}
