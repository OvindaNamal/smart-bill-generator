import React from 'react';
import { Form, Input, InputNumber, Space, Button, DatePicker, Select } from "antd";
import { PlusOutlined, MinusCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Item, Letterhead } from './types';
import geethanjaleePreview from "./assets/01.geethanjalee.png";
import sandaminiPreview from "./assets/02.sandamini.png";

interface ManualEntryProps {
  onGenerate: (customerName: string, items: Item[], billDate?: string, letterhead?: Letterhead) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onGenerate }) => {
  const [form] = Form.useForm();
  const selectedLetterhead = Form.useWatch('letterhead', form) || 'geethanjalee';

  const handleManualGenerate = (values: any) => {
    const { CustomerName, Subject, items, BillDate, letterhead } = values;
    const formattedDate = BillDate ? dayjs(BillDate).format("DD MMMM YYYY") : dayjs().format("DD MMMM YYYY");
    const formattedItems: Item[] = (items || []).map((item: any) => ({
      CustomerName,
      Subject,
      Item: item.Item,
      Quantity: item.Quantity || 0,
      Rate: item.Rate || 0,
    }));
    
    onGenerate(CustomerName || 'Manual Invoice', formattedItems, formattedDate, letterhead || 'geethanjalee');
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{ BillDate: dayjs(), letterhead: 'geethanjalee' }}
        onFinish={handleManualGenerate}
        onValuesChange={handleValuesChange}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <Form.Item
            label="Customer Name"
            name="CustomerName"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input placeholder="Enter customer name" size="large" />
          </Form.Item>
          <Form.Item
            label="Bill Date"
            name="BillDate"
            rules={[{ required: true, message: 'Please select bill date' }]}
          >
            <DatePicker
              size="large"
              format="DD MMMM YYYY"
              placeholder="Select bill date"
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <Form.Item
            label="Subject"
            name="Subject"
            rules={[{ required: false }]}
          >
            <Input placeholder="Enter subject (optional)" size="large" />
          </Form.Item>
          <Form.Item
            label="Letterhead"
            name="letterhead"
            rules={[{ required: true, message: 'Please select a letterhead' }]}
          >
            <Select size="large" placeholder="Select Letterhead">
              <Select.Option value="geethanjalee">Geethanjalee</Select.Option>
              <Select.Option value="sandamini">Sandamini</Select.Option>
              <Select.Option value="none">None of heading</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {/* Letterhead Preview */}
        {selectedLetterhead !== 'none' && (
          <div style={{ marginBottom: '.25rem', padding: '0.75rem', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 6 }}>Letterhead Preview:</div>
            <img
              src={selectedLetterhead === 'geethanjalee' ? geethanjaleePreview : sandaminiPreview}
              alt="Letterhead Preview"
              style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
        {selectedLetterhead === 'none' && (
          <div style={{ marginBottom: '1.25rem', padding: '0.6rem 0.75rem', background: '#f5f5f5', borderRadius: 8, color: '#888', fontSize: '0.85rem' }}>
            ℹ️ <strong>None of heading</strong> selected: The bill will be generated without a letterhead (suitable for pre-printed letterhead paper).
          </div>
        )}

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
