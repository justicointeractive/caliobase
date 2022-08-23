import styles from './caliobase-ui.module.css';

/* eslint-disable-next-line */
export interface CaliobaseUiProps {}

export function CaliobaseUi(props: CaliobaseUiProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to CaliobaseUi!</h1>
    </div>
  );
}

export default CaliobaseUi;
