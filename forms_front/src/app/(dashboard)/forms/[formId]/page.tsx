import FormBuilderClient from './_components/FormBuilderClient'

interface FormBuilderPageProps {
  params: Promise<{
    formId: string
  }>
}

export default async function FormBuilderPage({ params }: FormBuilderPageProps) {
  const { formId } = await params
  
  return <FormBuilderClient formId={formId} />
} 