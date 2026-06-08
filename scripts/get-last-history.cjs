const url = 'http://db.houzai.uz:8000/rest/v1/generation_history?select=*&order=created_at.desc&limit=5';
const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk'
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => console.error(err));
