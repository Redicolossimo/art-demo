/* eslint-disable no-shadow */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Col,
  Form as BForm,
  Row,
} from 'react-bootstrap';
import {
  Query,
  withApollo,
} from 'react-apollo';
import {
  Field,
  Form,
  Formik,
} from 'formik';
import styled from 'styled-components';
import _ from 'lodash';
import * as yup from 'yup';
import { withAlert } from 'react-alert';

import {
  ArtField,
  ArtSelect,
} from '../../forms';
import {
  GQL_GET_COMPANY_CATEGORIES_ALL,
  GQL_GET_ME,
  GQL_ME_UPDATE,
  GQL_REMOVE_COMPANY,
  GQL_REMOVE_UPLOAD,
  GQL_UPDATE_COMPANY,
  GQL_UPDATE_COMPANY_CATEGORY,
} from '../../../graphql/queries';
import config from '../../../config';
import { DARK_WHITE } from '../../../helpers/colors';
import ImageCropper from '../../ImageCropper';
import Editor from '../../forms/Editor';
import Location from '../location';
import DropFiles from '../../DropFiles';
import {
  COMPANIES_MODEL,
  COMPANY_MODEL,
  STATUS_EMPTY,
} from '../../../helpers/main';
import NoItems from '../../NoItems';

class TabCompany extends PureComponent {
  state = {
    isLoadingCompanyCategory: false,
    visibility: null,
  };

  onProcessFile = async () => {
    const { client } = this.props;

    await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
  };

  switchItem = (state, value) => this.setState({ [state]: !value });

  switchValue = (state, value) => this.setState({ [state]: value });

  deleteItem = async (companyId) => {
    const { client, alert } = this.props;
    try {
      await client.mutate({
        mutation: GQL_REMOVE_COMPANY,
        variables: { _id: companyId },
        refetchQueries: [{
          query: GQL_GET_COMPANY_CATEGORIES_ALL,
          fetchPolicy: 'network-only',
        }],
      });
      alert.show('Комания удалена', { type: 'success' });
      await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  handleUploadRemove = async (_id, type = 'image') => {
    const { client } = this.props;
    try {
      await client.mutate({
        mutation: GQL_REMOVE_UPLOAD,
        variables: { _id, kind: 'companies', file_type: type },
      });
      await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  handleAddCompany = async (models = []) => {
    const { client, alert } = this.props;
    try {
      await client.mutate({
        mutation: GQL_UPDATE_COMPANY,
        variables: {
          data: {
            url: `${Math.round(Date.now() / 1000)}`,
          },
        },
      });
      alert.show('Компания успешно добавлена', { type: 'success' });
      await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
      alert.show('Ошибка добавления!', { type: 'danger' });
    }
    this.setState({ visibility: models.length });
  };

  handleAddCompanyCategory = async ({ name, values, setFieldValue }) => {
    const { client, alert } = this.props;

    this.setState({ isLoadingCompanyCategory: true });

    let response;

    try {
      response = await client.mutate({
        mutation: GQL_UPDATE_COMPANY_CATEGORY,
        variables: { data: { name } },
      });

      await client.query({
        query: GQL_GET_COMPANY_CATEGORIES_ALL,
        fetchPolicy: 'network-only',
      });

      setFieldValue('categories_id', [
        ..._.get(values, 'categories_id', []),
        _.get(response, 'data.updateCompanyCategory._id')]);

      this.setState({ isLoadingCompanyCategory: false });

      alert.show('Ваша сфера деятельности успешно добавлена!', { type: 'success' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);

      this.setState({ isLoadingCompanyCategory: false });

      alert.show('Ошибка добавления!', { type: 'danger' });
    }
  };

  updateMe = async (field, me) => {
    const { client, alert } = this.props;
    try {
      const response = await client.mutate({
        mutation: GQL_ME_UPDATE,
        variables: {
          me: {
            [field]: !me[field],
          },
        },
      });

      const errors = _.get(response, 'errors.[0].extensions', false);

      if (errors) {
        alert.show('Ошибка обновления профиля!', { type: 'danger' });
      } else {
        await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  handleSubmit = async (values, { setSubmitting, setErrors }) => {
    const { client, alert } = this.props;
    try {
      const response = await client.mutate({
        mutation: GQL_UPDATE_COMPANY,
        variables: {
          data: _.pick(values, [
            '_id',
            'name',
            'owner_id',
            'workers_id',
            'description',
            'location_id',
            'inn',
            'ogrn',
            'www',
            'phone',
            'phone_mobile',
            'show_in_spec',
            'main',
            'advertise_on',
            'categories_id',
          ]),
        },
      });
      const errors = _.get(response, 'errors.[0].extensions', {});
      if (!_.isEmpty(errors)) {
        setSubmitting(false);
        setErrors(errors);
      } else {
        await client.query({ query: GQL_GET_ME, fetchPolicy: 'network-only' });
        alert.show('Данные сохранены', { type: 'success' });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
      alert.show('Что-то пошло не так', { type: 'danger' });
    }
  };

  getCategories = (values, setFieldValue) => {
    const { isLoadingCompanyCategory } = this.state;
    return (
      <Query
        query={GQL_GET_COMPANY_CATEGORIES_ALL}
        fetchPolicy="only-network"
      >
        {({ data }) => {
          const items = _.get(data, 'companyCategoriesAll', []);
          const categories = items.map((item) => ({
            label: item.name,
            value: item._id,
          }));
          return (
            <Field
              name="categories_id"
              label={(<H3>Сфера(ы) деятельности</H3>)}
              placeholder="Выберите"
              column
              multiple
              component={ArtSelect}
              options={categories}
              selectCreate
              isLoading={isLoadingCompanyCategory}
              onCreateOption={(name) => this.handleAddCompanyCategory({
                name, values, setFieldValue,
              })}
            />
          );
        }}
      </Query>
    );
  };

  render() {
    const { visibility } = this.state;

    const empty = {
      status: STATUS_EMPTY,
      noItemsText: 'У вас нет компаний',
      createText: 'Хотите добавить свою компанию?',
      btnText: 'Создать',
      onClick: () => this.handleAddCompany([]),
    };

    return (
      <CompanyUpdate>
        <Query query={GQL_GET_ME}>
          {({ loading, data }) => {
            const me = _.get(data, 'me', {});
            const models = me.companies || [];

            const initialValues = [];
            models.map((model) => (
              initialValues.push({
                _id: _.get(model, '_id', null),
                name: _.get(model, 'name', null),
                show_in_spec: _.get(model, 'show_in_spec', false),
                main: _.get(model, 'main', false),
                images: _.get(model, 'images', []),
                files: _.get(model, 'files', []),
                advertise_on: _.get(model, 'advertise_on', false),
                categories_id: _.get(model, 'categories_id', []) || [],
                location_id: _.get(model, 'location_id', null),
                inn: _.get(model, 'inn', ''),
                ogrn: _.get(model, 'ogrn', ''),
                www: _.get(model, 'www', ''),
                phone: _.get(model, 'phone', ''),
                phone_mobile: _.get(model, 'phone_mobile', ''),
                description: _.get(model, 'description', ''),
              })
            ));

            const validationSchema = yup.object().shape({
              name: yup.string('Только текст').nullable(),
              show_in_spec: yup.bool(),
              main: yup.bool(),
              advertise_on: yup.bool(),
              inn: yup.number('Только цифры').nullable(),
              ogrn: yup.number('Только цифры').nullable(),
              www: yup.string('Только текст')
                .matches(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi, 'URL может быть только вида http://artocratia.com или https://artocratia.com')
                .max(255, 'Максимально 255 знаков')
                .min(4, 'Минимально 5 знаков')
                .nullable(),
              phone: yup.string('Только текст').nullable(),
              phone_mobile: yup.string('Только текст').nullable(),
            });

            return (
              <>
                {loading && (
                  <div className="loader">
                    <div className="bar" />
                  </div>
                )}
                {models.length === 0 && (<H1>Компании</H1>)}
                {models.map((model, idx) => (
                  <Formik
                    key={model._id}
                    initialValues={initialValues[idx]}
                    validationSchema={validationSchema}
                    onSubmit={this.handleSubmit}
                    enableReinitialize
                  >
                    {({ values, isSubmitting, setFieldValue }) => (
                      <Form>
                        <Header idx={idx === 0 ? 1 : 0}>
                          <H1>{values.name ? `Компания "${values.name}"` : 'Новая компания'}</H1>
                          <Button
                            variant="link"
                            className="p-0 text-dark"
                            onClick={() => this.switchValue('visibility', visibility === idx ? null : idx)}
                          >
                            {visibility === idx ? ' Скрыть' : 'Редактировать'}
                          </Button>
                        </Header>

                        <ImageBlock>
                          <ImageBox image={_.get(model, 'avatar.key', null)} />
                          <ImageCropper
                            model={model}
                            name="avatar"
                            btnName="Загрузить логотип"
                            urlApi={`${config.api_url}upload/company/${_.get(model, '_id', '')}`}
                            onHide={this.onProcessFile}
                            removeImageBefore={this.handleUploadRemove}
                          />
                          {_.get(model, 'avatar.key', '') && (
                            <Button
                              variant="outline-danger"
                              onClick={() => this.handleUploadRemove(_.get(me, 'avatar._id', ''), me._id)}
                            >
                              Удалить фотографию
                            </Button>
                          )}
                        </ImageBlock>
                        <FormArea visibility={visibility === idx ? 1 : 0}>
                          <div className="bg-white p-4 p-md-5 mb-5">
                            <Field
                              name="name"
                              label={(
                                <>
                                  <H3 first={1}>Название компании</H3>
                                  <Help>Так будет отображаться название вашей компании</Help>
                                </>
                            )}
                              className="form-control-lg"
                              placeholder="Введите"
                              column
                              component={ArtField}
                            />

                            {this.getCategories(values, setFieldValue)}

                            <Field
                              name="description"
                              label={(<H3 first={0}>Описание компании и её услуг</H3>)}
                              placeholder="Введите описание"
                              column
                              component={Editor}
                            />

                            <Field
                              name="location_id"
                              component={Location}
                            />
                          </div>

                          <H2>Фото компании</H2>
                          <div className="bg-white p-4 p-md-5 mb-5">
                            <DropFiles
                              id="images-upload"
                              modelName={COMPANIES_MODEL}
                              data={values.images}
                              name="image"
                              allowMultiple
                              maxParallelUploads={5}
                              onProcessFile={() => initialValues[idx]}
                              handleUploadRemove={this.handleUploadRemove}
                              server={{
                                url: `${config.api_url}upload/${COMPANY_MODEL}/${model._id}`,
                                process: { withCredentials: true },
                              }}
                              maxFileSize="5MB"
                            />
                          </div>

                          <div className="bg-white p-4 p-md-5 mb-5">
                            <Field
                              name="inn"
                              placeholder="Введите ИНН"
                              className="form-control-lg"
                              column
                              label={(<H3 first={1}>ИНН</H3>)}
                              component={ArtField}
                            />

                            <Field
                              name="ogrn"
                              placeholder="Введите ОГРН"
                              className="form-control-lg"
                              column
                              label={(<H3 first={0}>ОГРН</H3>)}
                              component={ArtField}
                            />

                            <Field
                              name="www"
                              placeholder="Введите url сайта"
                              className="form-control-lg"
                              column
                              label={(<H3 first={0}>Электронный адрес сайта</H3>)}
                              component={ArtField}
                            />

                            <Field
                              name="phone"
                              placeholder="Введите телефон"
                              className="form-control-lg"
                              column
                              label={(<H3 first={0}>Телефон</H3>)}
                              component={ArtField}
                            />

                            <Field
                              name="phone_mobile"
                              placeholder="Введите мобильный телефон"
                              className="form-control-lg"
                              column
                              label={(<H3 first={0}>Мобильный телефон</H3>)}
                              component={ArtField}
                            />
                          </div>

                          <H2>Настройки приватности</H2>
                          <div className="bg-white p-4 p-md-5 mb-5">
                            <Row>
                              <Col md={6}>
                                <BForm.Check
                                  type="checkbox"
                                  className="mb-5"
                                  name="main"
                                  onClick={() => setFieldValue('main', !_.get(values, 'main'))}
                                  id={`main${idx}-switch`}
                                  label={(
                                    <H4>
                                      Сделать эту компанию основной
                                    </H4>
                                )}
                                  value={_.get(values, 'main')}
                                  checked={_.get(values, 'main')}
                                  onChange={() => setFieldValue('main', !_.get(values, 'main'))}
                                />
                              </Col>
                              <Col md={6}>
                                <BForm.Check
                                  type="checkbox"
                                  className="mb-5"
                                  name="show_in_spec"
                                  onClick={() => setFieldValue('show_in_spec', !_.get(values, 'show_in_spec'))}
                                  id={`show_in_spec${idx}-switch`}
                                  label={(
                                    <H4>
                                      Показывать компанию в разделе
                                      {' "'}
                                      Специалисты
                                      {'" '}
                                    </H4>
                                  )}
                                  value={_.get(values, 'show_in_spec')}
                                  checked={_.get(values, 'show_in_spec')}
                                  onChange={() => setFieldValue('show_in_spec', !_.get(values, 'show_in_spec'))}
                                />
                              </Col>
                            </Row>

                            {/* <BForm.Check
                           type="checkbox"
                           className="mb-3"
                           name="advertise_on"
                           onClick={() => setFieldValue('advertise_on',
                           !_.get(values, 'advertise_on'))}
                           id={`advertise_on${idx}-switch`}
                           label={(
                           <div className="d-inline-flex align-items-center">
                           <div className="ml-2 mr-2">
                           Включить рекламу компании на сервисе*
                           </div>
                           <ArtTooltip title={`Реклама для этой компании в
                           ${_.get(values, 'advertise_on') ? '' : 'ы'}ключена.`}>
                           <div>?</div>
                           </ArtTooltip>
                           </div>
                           )}
                           value={_.get(values, 'advertise_on')}
                           checked={_.get(values, 'advertise_on')}
                           onChange={() => setFieldValue('advertise_on',
                           !_.get(values, 'advertise_on'))}
                           />
                           <Link
                           md={12}
                           to="/payment"
                           className="text-secondary"
                           >
                           <small>* - Подробнее об услуге и оплате</small>
                           </Link> */}
                          </div>
                          <ButtonsBlock>
                            <Button
                              variant="primary"
                              type="submit"
                              size="lg"
                              className="mr-0 mr-md-3 mb-3 mb-md-0"
                            >
                              {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
                            </Button>
                            <Button
                              variant="outline-primary"
                              type="button"
                              size="lg"
                              className="mr-0 mr-md-3 mb-3 mb-md-0"
                              onClick={() => this.deleteItem(model._id)}
                            >
                              Удалить
                            </Button>
                          </ButtonsBlock>
                        </FormArea>
                      </Form>
                    )}
                  </Formik>
                ))}
                {models.length === 0 ? (
                  <EmptyBlock>
                    <NoItems
                      noItemsText={empty.noItemsText}
                      createText={empty.createText}
                      btnText={empty.btnText}
                      onClick={empty.onClick}
                    />
                  </EmptyBlock>
                ) : (
                  <ButtonsBlock>
                    <Button
                      variant="primary"
                      type="button"
                      size="lg"
                      className="mr-0 mr-md-5 mb-5 mb-md-0"
                      onClick={() => this.handleAddCompany(models)}
                    >
                      Добавить еще одну компанию
                    </Button>
                    <BForm.Check
                      type="checkbox"
                      name="first_me"
                      onClick={() => this.updateMe('first_me', me)}
                      id="first_me-switch"
                      label={(
                        <H4>
                          Показывать меня как компанию
                        </H4>
                      )}
                      value={!_.get(me, 'first_me')}
                      checked={!_.get(me, 'first_me')}
                      onChange={() => this.updateMe('first_me', me)}
                    />
                  </ButtonsBlock>
                )}
              </>
            );
          }}
        </Query>
      </CompanyUpdate>
    );
  }
}

const EmptyBlock = styled.div`
min-height: 60vh;
display: flex;
align-items: center;
justify-content: center;
`;

const ButtonsBlock = styled.div`
display: flex;
align-items: center;
margin-bottom: 50px;
.form-check {
  margin-bottom: 22px;
}
@media screen and (max-width: 812px) {
  flex-direction: column;
  padding: 0 20px;
  margin-bottom: 0;
  button {
    width: 100%;
  }
}
`;

const Header = styled.div`
margin-top: ${({ idx }) => (idx ? 10 : 60)}px;
display: flex;
align-items: center;
justify-content: space-between;
@media screen and (max-width: 812px) {
  flex-direction: column;
  padding: 0 20px;
}
`;
const FormArea = styled.div`
display: ${({ visibility }) => (visibility ? 'block' : 'none')};
`;

const CompanyUpdate = styled.div`
padding-bottom: 70px;
`;

const H1 = styled.h1`
font-weight: bold;
font-size: 40px;
@media screen and (max-width: 1024px) {
 font-size: 32px;
}
@media screen and (max-width: 812px) {
 font-size: 18px;
 line-height: 20px;
}
`;

const H2 = styled.h2`
font-weight: bold;
font-size: 26px;
line-height: 120%;
@media screen and (max-width: 1024px) {
font-size: 22px;
}
@media screen and (max-width: 812px) {
  font-size: 16px;
  padding: 0 20px 20px;
}
`;

const H3 = styled.h3`
font-weight: bold;
font-size: 26px;
line-height: 120%;
margin-top: ${({ first }) => (first ? 0 : 50)}px;
@media screen and (max-width: 812px) {
  font-size: 16px;
  margin-top: 30px;
}
`;

const H4 = styled.h4`
font-size: 12px;
line-height: 130%;
margin-bottom: 0;
position: relative;
top: 10px;
@media screen and (max-width: 812px) {
  font-size: 10px;
}
`;

const Help = styled.div`
font-size: 14px;
line-height: 130%;
@media screen and (max-width: 812px) {
  font-size: 12px;
}
`;

const ImageBlock = styled.div`
display: flex;
align-items: center;
justify-content: start;
background-color: white;
padding: 30px 50px;
margin-top: 40px;
margin-bottom: 30px;
.btn-crop {
    font-size: 12px;
    min-height: 43px;
    display: flex;
    line-height: 2;
    align-content: center;
    justify-content: center;
    padding: 10rem 1.2rem;
    margin-top: 8px;
    margin-right: 10px;
}
@media screen and (max-width: 812px) {
  flex-direction: column;
  button, .btn-crop {
    width: 100%;
  }
}
`;

const ImageBox = styled.div`
${(props) => (props.image ? `background-image: url(${config.api_url}files/${props.image})` : `background: ${DARK_WHITE}`)};
background-size: 100%;
border-radius: 50%;
margin-right: 20px;
min-width: 120px;
max-width: 120px;
width: 100%;
height: 120px;
display: flex;
align-items: center;
justify-content: center;
.filepond--drop-label.filepond--drop-label label {
    margin-top: 65px;
}
@media screen and (max-width: 812px) {
  margin-right: 0;
  margin-bottom: 20px;
}
`;

TabCompany.propTypes = {
  alert: PropTypes.object.isRequired,
  client: PropTypes.object.isRequired,
};

export default withAlert()(withApollo(TabCompany));
