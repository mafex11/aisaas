"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from 'react-hook-form';
import { defaultValues } from "@/constants"
import { CustomField } from "@/components/shared/CustomField"
import { Button } from "@/components/ui/button"
import { transformationTypes } from "@/constants"
import { aspectRatioOptions } from "@/constants"
import { useState } from "react"
import { debounce } from "@/lib/utils"
import { useTransition } from  "react"
import { deepMergeObjects } from "@/lib/utils"
import MediaUploader from "@/components/shared/MediaUploader"
import { Input } from "@/components/ui/input"
import { AspectRatioKey } from "@/lib/utils"
import { updateCredits } from "@/lib/actions/user.actions";
import TransformedImage from "./TransformedImage";
import { getCldImageUrl } from "next-cloudinary";
import { addImage } from "@/lib/actions/image.actions";
import { useRouter } from "next/navigation";
import { updateImage } from "@/lib/actions/image.actions";
import { creditFee } from "@/constants";
// import { Transformations } from "@/lib/utils";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";



export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
})

const TransformationForm = ({action, data=null, userId, type, creditBalance, config=null}: TransformationFormProps) => {

  const transformationType = transformationTypes[type];
  const [image, setImage] = useState(data)
  const [newTransformation, setNewTransformation] = useState<Transformations | null >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const[isTransforming, setIsTransforming] = useState(false);
  const[transformationConfig, setTransformationConfig] = useState(config);
  const [isPending, startTransition] = useTransition();
  const router = useRouter()

  const initialValues= data && action ==='Update'? {
    title: data?.title,
    aspectRatio: data?.aspectRatio,
    color: data?.color,
    prompt: data?.prompt,
    publicId: data?.publicId,
  } : defaultValues
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  })

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    if(data || image){
      const transformationUrl = getCldImageUrl({
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig
      })

      const imageData= {
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: transformationConfig,
        secureURL: image?.secureURL,
        transformationURL: transformationUrl,
        aspectRatio: image?.aspectRatio,
        prompt: values.prompt,
        color: values.color,
      }
      if (action === 'Add') {

        try {
          const newImage = await addImage({
            image: imageData,
            userId: userId,
            path: '/'
          })

          if(newImage) {
            form.reset ()
            setImage(data)
            router.push(`/transformations/$newImage._id}`)

          }

        } catch (error) {
          console.log(error);
        }
      }

      if(action === 'Update') {
        try {
          const updatedImage = await updateImage({
            image: {
              ...imageData,
              _id: data._id,

            },
            userId: userId,
            path: `/transformations/${data._id}`,
          })

          if(updatedImage) {
            router.push(`/transformations/$updatedImage._id}`)
          }
        } catch (error) {
          console.log(error);
        }
      }
    }
    setIsSubmitting(false);
  }

  const onSelectFieldHandler = (value: string,
    onChangeField: (value:string) => void) => {
      const imageSize = aspectRatioOptions[value as AspectRatioKey]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setImage((prevState: any)=> ({
        ...prevState,
        aspectRatio: imageSize.aspectRatio,
        width: imageSize.width,
        height: imageSize.height,
      }))
      setNewTransformation(transformationType.config);
      return onChangeField(value)
    }

  const onInputChangeHandler = (fieldName: string,
    value: string,
    type: string,
    onChangeField: (value:string) => void) => {
      debounce (()=>{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setNewTransformation((prevState: any) => ({
          ...prevState,
          [type]: {
            ...prevState[type],
            [fieldName === 'prompt' ? 'prompt' : 'to'] : value,
          },
        }));
        return onChangeField(value);
      }, 1000);
    }
    const onTransformHandler = async () => {
      setIsTransforming(true);
      setTransformationConfig(
        deepMergeObjects(newTransformation,
          transformationConfig)
        )
        setNewTransformation(null)

        startTransition(async () => {
          await updateCredits(userId, creditFee)
        })
    }

    useEffect(() => {
      if (image && (type === 'restore' || type === 'removeBackground')){
        setNewTransformation(transformationType.config)
      }
    }, [image, transformationType.config, type])

  return (
    <Form {...form}>

    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {creditBalance < Math.abs(creditFee)  && <InsufficientCreditsModal />}
      <CustomField control={form.control} name="title" formLabel="Image Title" className="w-full"render={({field}) =>
              <Input {...field} className="input-field" />}/>
        {type ==='fill' && (
          <CustomField control={form.control} name="aspectRatio" formLabel="Aspect Ratio" className="w-full" render = {({field}) => (
        <Select 
        onValueChange={(value)=> onSelectFieldHandler(value, field.onChange)}
        value={field.value}
        >

          <SelectTrigger className="select-field ">
            <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
              {Object.keys(aspectRatioOptions).map (key => (
              <SelectItem key={key} value={key} className="select-item">{aspectRatioOptions[key as AspectRatioKey].label}</SelectItem>
                  ))}
              </SelectContent>
        </Select>

      )}
      />
    )}

    {(type === 'remove' || type === 'recolor') && (
      <div className="prompt-field">
        <CustomField control={form.control} name="prompt" formLabel={
          type === 'remove' ? 'Object to remove' : 'Object to recolor'
        }
        className="w-full"
        render={({field}) => ( <Input
        value={field.value}
        className="input-field"
        onChange={(e) => onInputChangeHandler(
          'prompt',
          e.target.value,
          type,
          field.onChange
        )}
        />
      )}
         />

         {type === 'recolor' && (
          <CustomField
          control={form.control}
          name='color'
          formLabel="Replacement Color"
          className="w-full"
          render={({field}) => (
            <Input
            value={field.value}
            className="input-field"
            onChange={(e) => onInputChangeHandler(
              'color',
              e.target.value,
              'recolor',
              field.onChange
            )}
            />
          )}
          />
         )}
      </div>

      )}

      <div className="media-uploader-field">
        <CustomField
        control={form.control}
        name='publicId'
        className="flex size-full flex-col"
        render={({field}) =>(
          <MediaUploader
          onValueChange={field.onChange}
          setImage={setImage}
          image={image}
          publicId={field.value}
          type={type}
          />

        ) }
        />
        <TransformedImage
        image={image}
        type={type}
        title={form.getValues('title')}
        isTransforming={isTransforming}
        setIsTransforming={setIsTransforming}
        transformationConfig={transformationConfig}

        />
      </div>
      <div
      className="flex flex-col gap-4">
      <Button className="submit-button capitalize"
      disabled ={isTransforming || newTransformation === null}
      onClick={onTransformHandler}
      type="button"
      >
        {isTransforming ? 'Transforming...' : "Apply transformation"}</Button>

      <Button className="submit-button capitalize"
      disabled ={isSubmitting}
      type="submit">{isSubmitting? ' Submitting...' : 'save Image'}</Button>

      </div>


    </form>
  </Form>
  )
}

export default TransformationForm
