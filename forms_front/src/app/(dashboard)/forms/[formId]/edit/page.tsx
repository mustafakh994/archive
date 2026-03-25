import FormBuilderClient from '../_components/FormBuilderClient'

interface FormEditPageProps {
  params: Promise<{
    formId: string
  }>
}

export default async function FormEditPage({ params }: FormEditPageProps) {
  const { formId } = await params
  
  return <FormBuilderClient formId={formId} />
}