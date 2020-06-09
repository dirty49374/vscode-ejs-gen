function register(app) {
  app.get('/get', (req, res) => {
    res.send({ api: 'get' });
  });

  app.get('/set', (req, res) => {
    res.send({ api: 'set' });
  });

}

