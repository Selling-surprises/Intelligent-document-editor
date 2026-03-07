-- 创建存储桶
insert into storage.buckets (id, name, public) 
values ('app-81gn9zyg581t_images', 'app-81gn9zyg581t_images', true)
on conflict (id) do nothing;

-- 设置存储桶策略
create policy "Public Access" on storage.objects for select using (bucket_id = 'app-81gn9zyg581t_images');
create policy "Allow All Upload" on storage.objects for insert with check (bucket_id = 'app-81gn9zyg581t_images');
create policy "Allow All Delete" on storage.objects for delete using (bucket_id = 'app-81gn9zyg581t_images');
