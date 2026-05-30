import Row from '@/app/components/form/row';
import Text from '@/app/components/page/text';

export default function Checkbox({ children, ...props }: {
  children: React.ReactNode
  [key: string]: any
}) {
  return (
    <Row>
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-neutral-300"
      />
      <Text>
        {children}
      </Text>
    </Row>
  );
}
