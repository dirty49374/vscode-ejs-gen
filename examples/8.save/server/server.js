
function register(app) {
  app.get('/get', (req, res) => {
// {{{ GET_IMPL

    const result = { api: 'get' };
    res.send(result);

// }}}
  });

  app.get('/set', (req, res) => {
// {{{ SET_IMPL

    const result = { api: 'set' };
    res.send(result);

// }}}
  });

}

