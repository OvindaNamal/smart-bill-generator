import React from 'react';
import { Form, Input, InputNumber, Space, Button } from "antd";
import { PlusOutlined, MinusCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { Item } from './types';

interface ManualEntryProps {
  onGenerate: (customerName: string, items: Item[]) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onGenerate }) => {
  const [form] = Form.useForm();

  const handleManualGenerate = (values: any) => {
    const { CustomerName, Subject, items } = values;
    const formattedItems: Item[] = (items || []).map((item: any) => ({
      CustomerName,
      Subject,
      Item: item.Item,
      Quantity: item.Quantity || 0,
      Rate: item.Rate || 0,
    }));
    
    onGenerate(CustomerName || 'Manual Invoice', formattedItems);
  };

  const [totalAmount, setTotalAmount] = React.useState(0);

  const handleValuesChange = (_: any, allValues: any) => {
    const currentItems = allValues.items || [];
    const total = currentItems.reduce((sum: number, item: any) => {
      const q = typeof item?.Quantity === 'number' ? item.Quantity : 0;
      const r = typeof item?.Rate === 'number' ? item.Rate : 0;
      return sum + (q * r);
    }, 0);
    setTotalAmount(total);
  };

  const formatCurrency = (value: number) => `${value.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <Form form={form} layout="vertical" onFinish={handleManualGenerate} onValuesChange={handleValuesChange}>
        <Form.Item
          label="Customer Name"
          name="CustomerName"
          rules={[{ required: true, message: 'Please enter customer name' }]}
        >
          <Input placeholder="Enter customer name" size="large" />
        </Form.Item>
        <Form.Item
          label="Subject"
          name="Subject"
          rules={[{ required: false }]}
        >
          <Input placeholder="Enter subject (optional)" size="large" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <h3>Items</h3>
        </div>

        <Form.List name="items" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'Item']}
                    rules={[{ required: true, message: 'Missing item name' }]}
                  >
                    <Input placeholder="Item Description" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'Quantity']}
                    rules={[{ required: true, message: 'Missing quantity' }]}
                  >
                    <InputNumber placeholder="Qty" min={1} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'Rate']}
                    rules={[{ required: true, message: 'Missing rate' }]}
                  >
                    <InputNumber placeholder="Rate" min={0} step={0.01} />
                  </Form.Item>
                  {fields.length > 1 ? (
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} />
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Item
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '1rem', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            Total Amount: Rs. {formatCurrency(totalAmount)}
          </div>
          <Form.Item style={{ margin: 0 }}>
            <Button type="primary" htmlType="submit" size="large" icon={<FilePdfOutlined />}>
              Generate & Download PDF
            </Button>
          </Form.Item>
        </div>
      </Form>
    </div>
  );
};

export default ManualEntry;
